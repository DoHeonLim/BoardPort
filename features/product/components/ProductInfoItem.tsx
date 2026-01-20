/**
 * File Name : features/product/components/ProductInfoItem.tsx
 * Description : 제품 상세 정보 아이템 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.25  임도헌   Created
 * 2024.12.25  임도헌   Modified  제품 상세 정보 아이템 컴포넌트 추가
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 */

export default function ProductInfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="text-sm font-medium text-primary">{value}</dd>
    </div>
  );
}
