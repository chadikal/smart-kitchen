import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { RecipesService } from './recipe.service';
import { parseRecipeDetailQuery, RecipeQueryError } from './recipe-query';

@Controller()
export class CatalogController {
  constructor(private readonly recipes: RecipesService) {}

  @Get('countries')
  countries(@Query() query: Record<string, unknown>) {
    return this.options('country', query);
  }

  @Get('cuisines')
  cuisines(@Query() query: Record<string, unknown>) {
    return this.options('cuisine', query);
  }

  @Get('dietary-tags')
  dietaryTags(@Query() query: Record<string, unknown>) {
    return this.options('dietaryTag', query);
  }

  private options(
    kind: 'country' | 'cuisine' | 'dietaryTag',
    query: Record<string, unknown>,
  ) {
    const parsed = parse(() => parseRecipeDetailQuery(query));
    return this.recipes.catalog(kind, parsed.lang).then((items) => ({ items }));
  }
}

function parse<T>(read: () => T): T {
  try {
    return read();
  } catch (error) {
    if (error instanceof RecipeQueryError) throw new BadRequestException(error.message);
    throw error;
  }
}
