/**
 * File Name : features/product/lib/fetchInitialUserProducts.client.ts
 * Description : (클라이언트 전용) /api/user-products/initial 호출 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.03  임도헌   Created
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 */

import type { UserProductsScope } from "@/features/product/lib/getUserProducts";
import type { Paginated } from "@/types/product";

export async function fetchInitialUserProductsClient<T = any>(
  scope: UserProductsScope
): Promise<Paginated<T>> {
  const res = await fetch("/api/user-products/initial", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: scope.type, userId: scope.userId }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(
      `Failed to load initial products (${res.status}) ${msg ?? ""}`
    );
  }

  const json = (await res.json()) as {
    ok: boolean;
    data?: Paginated<T>;
    error?: string;
  };

  if (!json.ok || !json.data) {
    throw new Error(json.error || "Unknown error");
  }

  return json.data;
}
