/**
 * File Name : app/(public)/terms/page.tsx
 * Description : BoardPort 서비스 이용약관 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.07.06  임도헌   Created   공개 접근 가능한 서비스 이용약관 페이지 추가
 */
import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/components/global/BackButton";

export const metadata: Metadata = {
  title: "이용약관",
  description: "BoardPort 서비스 이용약관입니다.",
};

const sections = [
  {
    title: "1. 목적",
    body: [
      "본 약관은 BoardPort가 제공하는 보드게임 거래, 커뮤니티, 채팅, 방송/VOD, 알림 및 관련 서비스의 이용 조건과 절차, 이용자와 서비스의 권리와 의무를 정합니다.",
      "BoardPort는 운영 과정에서 서비스 범위와 정책을 변경할 수 있으며, 중요한 변경 사항은 서비스 화면 또는 공지사항을 통해 안내합니다.",
    ],
  },
  {
    title: "2. 계정과 이용 자격",
    body: [
      "이용자는 이메일, 휴대폰 번호, 소셜 로그인 등 서비스가 제공하는 방식으로 계정을 만들거나 로그인할 수 있습니다.",
      "이용자는 가입 및 서비스 이용 과정에서 정확한 정보를 제공해야 하며, 타인의 계정 또는 인증 수단을 무단으로 사용할 수 없습니다.",
      "서비스는 보안, 스팸 방지, 운영 정책 위반 대응을 위해 계정 생성, 로그인, SMS 인증 등 일부 요청을 제한할 수 있습니다.",
    ],
  },
  {
    title: "3. 게시물과 거래 활동",
    body: [
      "이용자는 상품, 게시글, 댓글, 채팅, 방송, 이미지, 영상 등 자신이 등록한 콘텐츠와 거래 활동에 대한 책임을 집니다.",
      "BoardPort는 이용자 간 거래의 중개 환경을 제공하며, 개별 거래의 당사자가 아닙니다.",
      "허위 정보, 타인의 권리 침해, 불법 물품 거래, 욕설 또는 괴롭힘, 서비스 운영을 방해하는 행위는 제한될 수 있습니다.",
    ],
  },
  {
    title: "4. 채팅과 약속",
    body: [
      "이용자는 상품 거래를 위해 채팅과 약속 기능을 사용할 수 있습니다.",
      "약속 수락, 취소, 거절 등 거래 상태에 영향을 주는 행위는 서비스 화면에 표시되는 상태와 알림에 반영될 수 있습니다.",
      "이용자는 실제 거래 과정에서 상대방과 충분히 확인하고, 안전한 장소와 방식으로 거래해야 합니다.",
    ],
  },
  {
    title: "5. 신고, 제재, 콘텐츠 조치",
    body: [
      "이용자는 부적절한 상품, 게시글, 방송, 프로필, 사용자 행위를 신고할 수 있습니다.",
      "서비스는 신고 내용, 운영 정책 위반 여부, 서비스 안정성 등을 검토해 콘텐츠 숨김, 삭제, 계정 제한, 정지 등의 조치를 할 수 있습니다.",
      "명백한 위반 또는 긴급한 피해 방지가 필요한 경우 사전 안내 없이 임시 조치가 이루어질 수 있습니다.",
    ],
  },
  {
    title: "6. 서비스 변경과 중단",
    body: [
      "서비스는 기능 개선, 보안 조치, 장애 대응, 외부 서비스 연동 상태 등에 따라 일부 기능을 변경하거나 중단할 수 있습니다.",
      "Cloudflare, Supabase, Vercel, SMS/이메일 발송 서비스 등 외부 서비스 장애가 발생하면 일부 기능 이용이 제한될 수 있습니다.",
    ],
  },
  {
    title: "7. 면책",
    body: [
      "BoardPort는 이용자 간 거래, 게시물, 채팅 내용, 외부 링크 또는 이용자가 등록한 콘텐츠의 정확성과 신뢰성을 보증하지 않습니다.",
      "이용자의 귀책 사유, 외부 서비스 장애, 천재지변 또는 이에 준하는 사유로 발생한 손해에 대해서는 책임이 제한될 수 있습니다.",
    ],
  },
  {
    title: "8. 약관 변경",
    body: [
      "서비스는 필요한 경우 본 약관을 변경할 수 있으며, 중요한 변경이 있는 경우 서비스 화면 또는 공지사항을 통해 안내합니다.",
      "변경된 약관은 별도 시행일을 정하지 않는 한 게시된 날부터 적용됩니다.",
    ],
  },
  {
    title: "9. 문의",
    body: [
      "서비스 이용, 약관, 운영 정책과 관련한 문의는 운영자 이메일로 접수할 수 있습니다.",
      "문의처: ldh2233@gmail.com",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-page-x pt-4 pb-10 text-primary">
      <article className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-3 border-b border-border-subtle pb-6">
          <BackButton
            fallbackHref="/"
            variant="inline"
            label="이전 화면으로 이동"
          />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">이용약관</h1>
            <p className="text-sm leading-relaxed text-muted">
              시행일: 2026년 7월 6일
            </p>
          </div>
        </header>

        <div className="space-y-7">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-base font-bold text-primary">
                {section.title}
              </h2>
              <div className="space-y-2 text-sm leading-7 text-muted">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="border-t border-border-subtle pt-6 text-sm text-muted">
          개인정보 처리 기준은{" "}
          <Link
            href="/privacy"
            className="focus-ring-soft rounded-md font-medium text-brand transition-colors hover:underline dark:text-brand-light"
          >
            개인정보 처리방침
          </Link>
          에서 확인할 수 있습니다.
        </footer>
      </article>
    </main>
  );
}
