/**
 * File Name : features/product/components/admin/ProductListContainer.tsx
 * Description : 관리자용 상품 목록 테이블 및 삭제 핸들링 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   상품 목록 조회, 링크 연결, 삭제 모달 연동
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  TrashIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import TimeAgo from "@/components/ui/TimeAgo";
import AdminSearchBar from "@/features/report/components/admin/AdminSearchBar";
import AdminPagination from "@/features/report/components/admin/AdminPagination";
import AdminActionModal from "@/features/report/components/admin/AdminActionModal";
import { deleteProductAdminAction } from "@/features/product/actions/admin";
import { cn, formatToWon } from "@/lib/utils";
import type { AdminProductListResponse } from "@/features/product/types";

interface ProductListContainerProps {
  data: AdminProductListResponse;
}

/**
 * 관리자 상품 목록 컨테이너
 *
 * [기능]
 * 1. 상품 정보(ID, 제목, 판매자, 가격, 상태, 등록일) 테이블 렌더링
 * 2. 상품 상세 페이지 바로가기 링크 제공
 * 3. 삭제 버튼 클릭 시 `AdminActionModal`을 통해 사유 입력 및 강제 삭제 수행
 * 4. 검색바 및 페이지네이션 통합
 */
export default function ProductListContainer({
  data,
}: ProductListContainerProps) {
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const handleDelete = async (reason: string) => {
    if (!deleteTarget) return;
    const res = await deleteProductAdminAction(deleteTarget.id, reason);
    if (res.success) {
      toast.success("상품 삭제 완료");
      setDeleteTarget(null);
    } else toast.error(res.error);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <AdminSearchBar placeholder="상품명 또는 판매자 검색" />
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-dim text-muted font-bold border-b border-border">
              <tr>
                <th className="px-6 py-4 w-16">ID</th>
                <th className="px-6 py-4">상품명</th>
                <th className="px-6 py-4 w-32">판매자</th>
                <th className="px-6 py-4 w-32">가격</th>
                <th className="px-6 py-4 w-24">상태</th>
                <th className="px-6 py-4 w-32">등록일</th>
                <th className="px-6 py-4 w-20 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-muted">
                    등록된 상품이 없습니다.
                  </td>
                </tr>
              ) : (
                data.items.map((product) => {
                  const isSold = !!product.purchase_userId;
                  const isReserved = !!product.reservation_userId && !isSold;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-surface-dim/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-muted font-mono text-xs">
                        #{product.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 max-w-sm">
                          <span className="truncate font-semibold text-primary">
                            {product.title}
                          </span>
                          <Link
                            href={`/products/view/${product.id}`}
                            target="_blank"
                            className="text-muted hover:text-brand"
                          >
                            <ArrowTopRightOnSquareIcon className="size-4" />
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-primary">
                        {product.user.username}
                      </td>
                      <td className="px-6 py-4 font-bold text-brand dark:text-brand-light">
                        {formatToWon(product.price)}원
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold",
                            isSold
                              ? "bg-surface-dim text-muted"
                              : isReserved
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-brand/10 text-brand dark:text-brand-light"
                          )}
                        >
                          {isSold
                            ? "판매완료"
                            : isReserved
                              ? "예약중"
                              : "판매중"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted">
                        <TimeAgo date={product.created_at} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              id: product.id,
                              title: product.title,
                            })
                          }
                          className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg"
                        >
                          <TrashIcon className="size-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination
        currentPage={data.currentPage}
        totalPages={data.totalPages}
      />

      <AdminActionModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="상품 강제 삭제"
        description={`'${deleteTarget?.title}' 상품을 삭제하시겠습니까?`}
        confirmLabel="삭제 확정"
        confirmVariant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
