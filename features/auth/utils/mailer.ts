/**
 * File Name : features/auth/utils/mailer.ts
 * Description : Resend API를 이용한 이메일 발송 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.04.13  임도헌   Created    최초 구현 (app/api/email/verify/actions 내 로컬 함수)
 * 2025.10.14  임도헌   Moved      app/api/email/verify/actions → lib/auth/email/mailer.ts 로 이동
 * 2025.10.14  임도헌   Modified   sendEmail 단일 책임 함수로 분리
 * 2026.01.19  임도헌   Moved      lib/auth -> features/auth/lib
 * 2026.01.21  임도헌   Moved      lib/email/mailer -> utils/mailer
 * 2026.01.25  임도헌   Modified  주석 보강
 */

import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 인증 번호가 포함된 이메일을 발송
 *
 * @param {string} email - 수신자 이메일 주소
 * @param {string} token - 6자리 인증 번호
 * @returns {Promise<void>}
 * @throws {Error} 이메일 전송 실패 시
 */
export const sendEmail = async (
  email: string,
  token: string
): Promise<void> => {
  try {
    await resend.emails.send({
      from: "Board Port <noreply@boardport.xyz>",
      to: email,
      subject: "이메일 인증",
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
          <h2 style="color: #333; text-align: center;">이메일 인증</h2>
          <p style="color: #666; line-height: 1.6;">아래의 인증번호를 입력해주세요.</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 4px;">${token}</h1>
          </div>
          <p style="color: #666; line-height: 1.6;">이 인증번호는 10분 동안 유효합니다.</p>
          <p style="color: #666; line-height: 1.6; font-size: 14px;">본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
            <p>© 2025 Board Port. All rights reserved.</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("이메일 전송 실패:", error);
    throw new Error("이메일 전송에 실패했습니다.");
  }
};
