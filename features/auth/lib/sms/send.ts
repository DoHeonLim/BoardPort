/**
 * File Name : features/auth/lib/sms/send.ts
 * Description : 유저 SMS 전송
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  coolsms 유틸 분리
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 */
import coolsms from "coolsms-node-sdk";

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
