/**
 * File Name : app/(public)/privacy/page.tsx
 * Description : BoardPort 개인정보 처리방침 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.07.06  임도헌   Created   공개 접근 가능한 개인정보 처리방침 페이지 추가
 */
import type { Metadata } from "next";
import Link from "next/link";
import BackButton from "@/components/global/BackButton";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "BoardPort 개인정보 처리방침입니다.",
};

const sections = [
  {
    title: "1. 수집하는 개인정보",
    body: [
      "BoardPort는 회원 가입, 로그인, 프로필 설정, 거래/커뮤니티 기능 제공을 위해 이메일, 휴대폰 번호, 닉네임, 프로필 이미지, 선택한 활동 지역 및 거래 지역 정보를 처리할 수 있습니다.",
      "상품, 게시글, 댓글, 채팅, 방송/VOD, 이미지, 영상, 신고, 리뷰 등 이용자가 서비스에 등록하거나 주고받은 콘텐츠와 활동 기록이 저장될 수 있습니다.",
      "서비스 안정성, 보안, 부정 이용 방지를 위해 IP 주소, 접속 로그, 기기/브라우저 정보, 쿠키, 알림 구독 정보, rate limit 기록이 생성될 수 있습니다.",
    ],
  },
  {
    title: "2. 개인정보 이용 목적",
    body: [
      "계정 생성과 로그인, 본인 확인, SMS/이메일 인증, 프로필 관리 등 회원 관리를 위해 개인정보를 이용합니다.",
      "상품 거래, 채팅 약속, 게시글, 방송/VOD, 알림, 신고 처리, 관리자 운영 등 서비스 기능 제공을 위해 개인정보를 이용합니다.",
      "서비스 보안, 스팸 및 자동화 요청 방지, 장애 대응, 이용 제한 및 운영 정책 집행을 위해 접속 기록과 요청 정보를 이용할 수 있습니다.",
    ],
  },
  {
    title: "3. 지역 정보 처리",
    body: [
      "BoardPort는 현재 위치를 자동으로 추적하는 위치기반서비스를 제공하지 않습니다.",
      "이용자가 직접 선택하거나 입력한 활동 지역과 거래 지역은 상품 목록, 게시글 피드, 알림, 직거래 약속 등 지역 기반 화면을 제공하기 위해 사용됩니다.",
    ],
  },
  {
    title: "4. 외부 서비스와 처리 위탁",
    body: [
      "서비스 운영을 위해 Vercel, Supabase/PostgreSQL, Cloudflare Images/Stream, CoolSMS, Resend, 브라우저/운영체제의 Web Push 인프라를 사용할 수 있습니다.",
      "이미지와 영상 업로드, 라이브/VOD 처리, SMS 인증, 이메일 인증, 알림 전송, 서비스 배포와 데이터 저장 과정에서 필요한 최소한의 정보가 각 외부 서비스로 전달될 수 있습니다.",
      "외부 서비스는 각자의 보안 및 개인정보 처리 기준에 따라 데이터를 처리합니다.",
    ],
  },
  {
    title: "5. 보유 및 파기",
    body: [
      "개인정보는 서비스 제공과 운영 목적이 달성될 때까지 보관하며, 회원 탈퇴 또는 삭제 요청 시 관련 법령과 운영상 필요한 범위를 제외하고 삭제하거나 비식별 처리합니다.",
      "신고, 제재, 감사 로그, 보안 기록 등 분쟁 대응과 서비스 안전을 위해 필요한 정보는 일정 기간 보관될 수 있습니다.",
      "SMS 인증번호, 비밀번호 재설정 토큰 등 일회성 인증 정보는 정해진 유효 기간이 지나면 사용할 수 없으며, 서비스 요청 시 지연 정리될 수 있습니다.",
    ],
  },
  {
    title: "6. 이용자의 권리",
    body: [
      "이용자는 자신의 개인정보에 대해 열람, 정정, 삭제, 탈퇴를 요청할 수 있습니다.",
      "서비스 화면에서 직접 수정할 수 없는 정보나 추가 요청은 운영자 문의를 통해 처리할 수 있습니다.",
      "법령상 보관이 필요하거나 부정 이용 방지를 위해 필요한 정보는 요청 즉시 삭제가 제한될 수 있습니다.",
    ],
  },
  {
    title: "7. 쿠키, 로그, 알림",
    body: [
      "서비스는 로그인 세션 유지, 사용자 경험 개선, 보안 확인을 위해 쿠키와 브라우저 저장소를 사용할 수 있습니다.",
      "Web Push 알림을 선택한 경우 브라우저 또는 기기에서 발급한 푸시 구독 정보가 저장될 수 있으며, 이용자는 브라우저 또는 서비스 설정에서 알림을 해제할 수 있습니다.",
    ],
  },
  {
    title: "8. 개인정보 보호 문의",
    body: [
      "개인정보 처리와 관련한 문의는 서비스 운영자 이메일로 접수할 수 있습니다.",
      "문의처: ldh2233@gmail.com",
    ],
  },
  {
    title: "9. 방침 변경",
    body: [
      "본 개인정보 처리방침은 서비스 기능, 운영 환경, 법령 변경에 따라 수정될 수 있습니다.",
      "중요한 변경이 있는 경우 서비스 화면 또는 공지사항을 통해 안내합니다.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-page-x pt-4 pb-10 text-primary">
      <article className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-3 border-b border-border-subtle pb-6">
          <BackButton fallbackHref="/" variant="inline" label="이전 화면으로 이동" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              개인정보 처리방침
            </h1>
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
          서비스 이용 조건은{" "}
          <Link
            href="/terms"
            className="focus-ring-soft rounded-md font-medium text-brand transition-colors hover:underline dark:text-brand-light"
          >
            이용약관
          </Link>
          에서 확인할 수 있습니다.
        </footer>
      </article>
    </main>
  );
}
