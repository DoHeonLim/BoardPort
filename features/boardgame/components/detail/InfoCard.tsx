/**
 * File Name : features/boardgame/components/detail/InfoCard.tsx
 * Description : 보드게임 상세 메타데이터 카드
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   상세 페이지 메타데이터 카드 UI 분리
 */

/**
 * 보드게임 원천 메타데이터 (예: 플레이 인원, 플레이 시간 등)를 라벨과 값으로 받아 카드 형태로 표시하는 컴포넌트
 *
 * @param props - 카드 라벨과 표시값
 * @returns 보드게임 상세 메타데이터 카드
 */
export default function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className="mt-2 text-base font-bold text-primary">{value}</p>
    </div>
  );
}
