/**
 * File Name : features/auth/utils/smsSender.ts
 * Description : CoolSMS 기반 문자 발송 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  coolsms 유틸 분리
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 * 2026.01.21  임도헌   Moved     lib/sms/send -> utils/smsSender
 * 2026.01.25  임도헌   Modified  주석 보강
 */
import "server-only";
import coolsms from "coolsms-node-sdk";

/**
 * CoolSMS API를 사용하여 단문 SMS를 전송합니다.
 *
 * @param {string} phone - 수신자 전화번호 (하이픈 없는 숫자)
 * @param {string} token - 인증 번호
 * @returns {Promise<void>}
 * @throws {Error} SMS 전송 실패 시
 */

export async function sendSMS(phone: string, token: string) {
  const apiKey = process.env.COOLSMS_API_KEY!;
  const apiSecret = process.env.COOLSMS_API_SECRET!;
  const sender = process.env.COOLSMS_SENDER_NUMBER!;

  // CoolSMS객체 만든다.
  const messageService = new coolsms(apiKey, apiSecret);

  try {
    await messageService.sendOne({
      to: phone, // 수신자
      from: sender, // 발신자
      text: `당신의 BoardPort 인증 번호는 ${token}입니다.`, // 메시지
      type: "SMS", // 메세지의 타입 SMS(단문)
      autoTypeDetect: false, // 메시지 자동 감지 여부
    });
  } catch (error) {
    console.error("SMS 전송 실패:", error);
    throw new Error("SMS 전송에 실패했습니다.");
  }
}
