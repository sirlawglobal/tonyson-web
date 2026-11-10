import type { Category } from '@sirlawglobal/contracts';
import { ApiError, audit, db, simulate, uid } from './db';

export interface CategoryInput {
  name: string;
  slug: string;
  emoji: string;
  tint: string;
  parentId: string | null;
}

export function syncCategoryCounts() {
  for (const c of db.categories) c.productCount = db.products.filter((p) => p.categoryId === c.id).length;
}

export function listAdminCategories(): Promise<Category[]> {
  return simulate(() => {
    syncCategoryCounts();
    return db.categories.map((c) => ({ ...c }));
  });
}

function assertUniqueSlug(slug: string, ignoreId?: string) {
  if (db.categories.some((c) => c.slug === slug && c.id !== ignoreId)) throw new ApiError('Another category already uses that slug.', 409);
}

export function createCategory(input: CategoryInput): Promise<Category> {
  return simulate(() => {
    assertUniqueSlug(input.slug);
    const c: Category = { id: uid('cat'), ...input, productCount: 0 };
    db.categories.push(c);
    audit('category.created', c.name);
    return c;
  });
}

export function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  return simulate(() => {
    const c = db.categories.find((x) => x.id === id);
    if (!c) throw new ApiError('Category not found', 404);
    if (input.parentId === id) throw new ApiError('A category cannot be its own parent.', 400);
    assertUniqueSlug(input.slug, id);
    Object.assign(c, input);
    audit('category.updated', c.name);
    return { ...c };
  });
}

export function deleteCategory(id: string): Promise<void> {
  return simulate(() => {
    const c = db.categories.find((x) => x.id === id);
    if (!c) throw new ApiError('Category not found', 404);
    if (db.products.some((p) => p.categoryId === id)) throw new ApiError('This category still has products. Move or archive them first.', 409);
    if (db.categories.some((x) => x.parentId === id)) throw new ApiError('This category has subcategories. Remove them first.', 409);
    db.categories = db.categories.filter((x) => x.id !== id);
    audit('category.deleted', c.name);
  });
}
