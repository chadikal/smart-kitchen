import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogController } from './catalog.controller';
import { RecipesService } from './recipe.service';
import { RecipesController } from './recipes.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RecipesController, CatalogController],
  providers: [RecipesService],
})
export class RecipesModule {}
