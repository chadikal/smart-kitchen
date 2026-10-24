import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { RecipesService } from './recipe.service';
import {
  parseRecipeDetailQuery,
  parseRecipeListQuery,
  parseRecipeSlug,
  RecipeQueryError,
} from './recipe-query';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  @Get()
  list(@Query() query: Record<string, unknown>) {
    return this.recipes.list(parseQuery(() => parseRecipeListQuery(query)));
  }

  @Get(':slug')
  detail(@Param('slug') slug: string, @Query() query: Record<string, unknown>) {
    const parsed = parseQuery(() => ({
      slug: parseRecipeSlug(slug),
      ...parseRecipeDetailQuery(query),
    }));
    return this.recipes.detail(parsed.slug, parsed.lang);
  }
}

function parseQuery<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    if (error instanceof RecipeQueryError) throw new BadRequestException(error.message);
    throw error;
  }
}
