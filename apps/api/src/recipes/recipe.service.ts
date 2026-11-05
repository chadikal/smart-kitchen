import { homeSelection } from './home-selection';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PublicLanguage,
  selectCatalogLabel,
  trimCharacters,
  toDatabaseLanguage,
  toPublicLanguage,
} from './recipe-language';
import {
  mapPublicRecipe,
  publicRecipeInclude,
  RecipeContentError,
  RecipeDetail,
  RecipeSummary,
} from './recipe.mapper';
import { escapeLike, RecipeListQuery } from './recipe-query';

export interface RecipeListResponse {
  items: RecipeSummary[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

export interface CatalogOption {
  slug: string;
  name: string;
  language: PublicLanguage;
  fallbackUsed: boolean;
}

export interface CountryOption extends CatalogOption {
  code: string | null;
}

export type CatalogKind = 'country' | 'cuisine' | 'dietaryTag';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: RecipeListQuery): Promise<RecipeListResponse> {
    return this.prisma.$transaction(
      (tx) => this.listSnapshot(tx, query),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  private async listSnapshot(tx: Prisma.TransactionClient, query: RecipeListQuery, excluded: string[] = [], verifiedTimesOnly = false): Promise<RecipeListResponse> {
    const title = selectedTitle(toDatabaseLanguage(query.lang));
    const where = Prisma.sql`${publicConditions(query, title)}
      AND ${excluded.length ? Prisma.sql`r.slug NOT IN (${Prisma.join(excluded)})` : Prisma.sql`TRUE`}
      AND ${verifiedTimesOnly ? Prisma.sql`NOT EXISTS (
        SELECT 1 FROM recipe_metadata_reviews review WHERE review.recipe_id = r.id
        AND (review.fields->'prepTimeMinutes'->>'basis' = 'ESTIMATE'
          OR review.fields->'cookTimeMinutes'->>'basis' = 'ESTIMATE'
          OR review.fields->'additionalTimeMinutes'->>'basis' = 'ESTIMATE')
      )` : Prisma.sql`TRUE`}`;
    const totals = await tx.$queryRaw<Array<{ total: unknown }>>(
      Prisma.sql`SELECT CAST(count(*) AS integer) AS total FROM recipes r WHERE ${where}`,
    );
    const total = readCount(totals[0]?.total);
    const order = query.sort === 'fastest'
      ? Prisma.sql`(r.prep_time_minutes + r.cook_time_minutes + r.additional_time_minutes) ASC NULLS LAST,`
      : query.sort === 'easiest'
        ? Prisma.sql`CASE r.difficulty::text WHEN 'EASY' THEN 0 WHEN 'MEDIUM' THEN 1 WHEN 'HARD' THEN 2 ELSE 3 END,`
        : Prisma.empty;
    const ids = await tx.$queryRaw<Array<{ id: unknown }>>(
      Prisma.sql`
        SELECT r.id
        FROM recipes r
        WHERE ${where}
        ORDER BY ${order} lower(${title}), r.slug
        LIMIT ${query.pageSize}
        OFFSET ${(query.page - 1) * query.pageSize}
      `,
    );
    const orderedIds = ids.map((row) => readId(row.id));
    const records =
      orderedIds.length === 0
        ? []
        : await tx.recipe.findMany({
            where: { id: { in: orderedIds } },
            include: publicRecipeInclude,
          });
    const byId = new Map(records.map((record) => [record.id, record]));
    const items = orderedIds.map((id) => {
      const record = byId.get(id);
      if (!record) throw new InternalServerErrorException('Recipe content is invalid.');
      return this.present(record, query.lang, false);
    });
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      pageCount: total === 0 ? 0 : Math.ceil(total / query.pageSize),
    };
  }

  async home(lang: PublicLanguage) {
    return this.prisma.$transaction(async (tx) => {
      const selected = async (slugs: readonly string[]) => {
        const visible = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT r.id FROM recipes r WHERE ${publicConditions({ lang, page: 1, pageSize: 1 }, Prisma.sql`r.slug`)}
          AND r.slug IN (${Prisma.join([...slugs])})`);
        const rows = await tx.recipe.findMany({ where: { id: { in: visible.map((row) => row.id) } }, include: publicRecipeInclude });
        return slugs.flatMap((slug) => { const row = rows.find((record) => record.slug === slug); return row ? [this.present(row, lang, false)] : []; });
      };
      const featured = (await selected(homeSelection.featured))[0] ?? null;
      const picks = (await selected(homeSelection.picks)).filter((item) => item.slug !== featured?.slug);
      const used = [...(featured ? [featured.slug] : []), ...picks.map((item) => item.slug)];
      const quick = (await this.listSnapshot(tx, { lang, maxTotalMinutes: 30, page: 1, pageSize: 3 }, used, true)).items;
      used.push(...quick.map((item) => item.slug));
      const more = (await this.listSnapshot(tx, { lang, page: 1, pageSize: 6 }, used)).items;
      return { featured, picks, quick, more };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async catalog(kind: CatalogKind, lang: PublicLanguage): Promise<CatalogOption[] | CountryOption[]> {
    const ids = await this.prisma.$queryRaw<Array<{ id: unknown }>>(catalogIdQuery(kind));
    const orderedIds = ids.map((row) => readId(row.id));
    if (orderedIds.length === 0) return [];
    const requested = toDatabaseLanguage(lang);
    if (kind === 'country') {
      const rows = await this.prisma.country.findMany({
        where: { id: { in: orderedIds } },
        include: { translations: true },
      });
      return sortOptions(
        rows.flatMap((row) => {
          const label = selectCatalogLabel(row.originalLanguage, row.translations, requested);
          if (!label) return [];
          const code = row.code?.trim() ?? '';
          return [
            {
              slug: row.slug,
              name: label.name,
              language: toPublicLanguage(label.language),
              fallbackUsed: toPublicLanguage(label.language) !== lang,
              code: code === '' ? null : code,
            },
          ];
        }),
        lang,
      );
    }
    const rows =
      kind === 'cuisine'
        ? await this.prisma.cuisine.findMany({
            where: { id: { in: orderedIds } },
            include: { translations: true },
          })
        : await this.prisma.dietaryTag.findMany({
            where: { id: { in: orderedIds } },
            include: { translations: true },
          });
    return sortOptions(
      rows.flatMap((row) => {
        const label = selectCatalogLabel(row.originalLanguage, row.translations, requested);
        if (!label) return [];
        return [
          {
            slug: row.slug,
            name: label.name,
            language: toPublicLanguage(label.language),
            fallbackUsed: toPublicLanguage(label.language) !== lang,
          },
        ];
      }),
      lang,
    );
  }

  async detail(slug: string, lang: PublicLanguage): Promise<RecipeDetail> {
    return this.prisma.$transaction(
      (tx) => this.detailSnapshot(tx, slug, lang),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  private async detailSnapshot(tx: Prisma.TransactionClient, slug: string, lang: PublicLanguage): Promise<RecipeDetail> {
    const title = selectedTitle(toDatabaseLanguage(lang));
    const where = publicConditions({ lang, page: 1, pageSize: 1 }, title, slug);
    const rows = await tx.$queryRaw<Array<{ id: unknown }>>(
      Prisma.sql`SELECT r.id FROM recipes r WHERE ${where} LIMIT 1`,
    );
    const id = rows[0] ? readId(rows[0].id) : undefined;
    if (!id) throw new NotFoundException('Recipe not found');
    const record = await tx.recipe.findUnique({
      where: { id },
      include: publicRecipeInclude,
    });
    if (!record) throw new NotFoundException('Recipe not found');
    return this.present(record, lang, true);
  }

  private present(
    record: Parameters<typeof mapPublicRecipe>[0],
    lang: PublicLanguage,
    detail: true,
  ): RecipeDetail;
  private present(
    record: Parameters<typeof mapPublicRecipe>[0],
    lang: PublicLanguage,
    detail: false,
  ): RecipeSummary;
  private present(
    record: Parameters<typeof mapPublicRecipe>[0],
    lang: PublicLanguage,
    detail: boolean,
  ): RecipeSummary | RecipeDetail {
    try {
      const mapped = detail
        ? mapPublicRecipe(record, lang, true)
        : mapPublicRecipe(record, lang, false);
      if (!mapped) throw new RecipeContentError();
      return mapped;
    } catch (error) {
      if (error instanceof RecipeContentError) {
        throw new InternalServerErrorException('Recipe content is invalid.');
      }
      throw error;
    }
  }
}

/**
 * Completeness matches isCompleteTranslation: a nonblank title, and a nonblank
 * instruction on this translation for every step. No steps leaves the title check.
 */
export function translationIsComplete(languageText: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    EXISTS (
      SELECT 1
      FROM recipe_translations candidate
      WHERE candidate.recipe_id = r.id
        AND candidate.language::text = ${languageText}
        AND btrim(candidate.title, ${trimCharacters}) <> ''
        AND NOT EXISTS (
          SELECT 1
          FROM recipe_steps step
          WHERE step.recipe_id = r.id
            AND NOT EXISTS (
              SELECT 1
              FROM recipe_step_translations written
              WHERE written.step_id = step.id
                AND written.recipe_translation_id = candidate.id
                AND btrim(written.instruction, ${trimCharacters}) <> ''
            )
        )
    )
  `;
}

function selectedTitle(requestedLanguage: string): Prisma.Sql {
  const requestedComplete = translationIsComplete(Prisma.sql`${requestedLanguage}`);
  return Prisma.sql`(
    SELECT chosen.title
    FROM recipe_translations chosen
    WHERE chosen.recipe_id = r.id
      AND chosen.language::text = CASE
        WHEN ${requestedComplete} THEN ${requestedLanguage}
        ELSE r.original_language::text
      END
  )`;
}

function publicConditions(
  query: RecipeListQuery,
  title: Prisma.Sql,
  slug?: string,
): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`r.publication_status::text = 'PUBLISHED'`,
    Prisma.sql`r.visibility::text = 'PUBLIC'`,
    developmentContentCondition(),
    translationIsComplete(Prisma.sql`r.original_language::text`),
  ];
  if (slug) conditions.push(Prisma.sql`r.slug = ${slug}`);
  if (query.q) {
    conditions.push(
      Prisma.sql`${title} ILIKE ${`%${escapeLike(query.q)}%`} ESCAPE '\\'`,
    );
  }
  if (query.country) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM recipe_countries link
      INNER JOIN countries country ON country.id = link.country_id
      WHERE link.recipe_id = r.id AND country.slug = ${query.country}
    )`);
  }
  if (query.cuisine) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM recipe_cuisines link
      INNER JOIN cuisines cuisine ON cuisine.id = link.cuisine_id
      WHERE link.recipe_id = r.id AND cuisine.slug = ${query.cuisine}
    )`);
  }
  if (query.dietaryTag) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1
      FROM recipe_dietary_tags link
      INNER JOIN dietary_tags tag ON tag.id = link.dietary_tag_id
      WHERE link.recipe_id = r.id AND tag.slug = ${query.dietaryTag}
    )`);
  }
  if (query.difficulty) {
    conditions.push(Prisma.sql`r.difficulty::text = ${query.difficulty}`);
  }
  if (query.maxTotalMinutes !== undefined) {
    conditions.push(
      Prisma.sql`(r.prep_time_minutes + r.cook_time_minutes + r.additional_time_minutes) <= ${query.maxTotalMinutes}`,
    );
  }
  return Prisma.join(conditions, ' AND ');
}

function catalogIdQuery(kind: CatalogKind): Prisma.Sql {
  const listed = Prisma.sql`
    r.publication_status::text = 'PUBLISHED'
    AND r.visibility::text = 'PUBLIC'
    AND ${developmentContentCondition()}
    AND ${translationIsComplete(Prisma.sql`r.original_language::text`)}
  `;
  if (kind === 'country') {
    return Prisma.sql`
      SELECT entity.id::text AS id
      FROM countries entity
      WHERE EXISTS (
        SELECT 1
        FROM recipes r
        INNER JOIN recipe_countries link
          ON link.recipe_id = r.id AND link.country_id = entity.id
        WHERE ${listed}
      )
    `;
  }
  if (kind === 'cuisine') {
    return Prisma.sql`
      SELECT entity.id::text AS id
      FROM cuisines entity
      WHERE EXISTS (
        SELECT 1
        FROM recipes r
        INNER JOIN recipe_cuisines link
          ON link.recipe_id = r.id AND link.cuisine_id = entity.id
        WHERE ${listed}
      )
    `;
  }
  return Prisma.sql`
    SELECT entity.id::text AS id
    FROM dietary_tags entity
    WHERE EXISTS (
      SELECT 1
      FROM recipes r
      INNER JOIN recipe_dietary_tags link
        ON link.recipe_id = r.id AND link.dietary_tag_id = entity.id
      WHERE ${listed}
    )
  `;
}

function sortOptions<T extends CatalogOption>(items: T[], lang: PublicLanguage): T[] {
  return [...items].sort((left, right) => {
    const name = left.name.localeCompare(right.name, lang, { sensitivity: 'base' });
    if (name !== 0) return name;
    return left.slug < right.slug ? -1 : left.slug > right.slug ? 1 : 0;
  });
}

function readCount(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  throw new InternalServerErrorException('Recipe content is invalid.');
}

function readId(value: unknown): string {
  if (typeof value === 'string' && value !== '') return value;
  throw new InternalServerErrorException('Recipe content is invalid.');
}

export function developmentContentCondition(): Prisma.Sql {
  return process.env.NODE_ENV === "development" ? Prisma.sql`TRUE` : Prisma.sql`r.development_only = false`;
}
