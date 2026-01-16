/**
 * File Name : components/auth/background/Waves.tsx
 * Description : 파도 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  갈매기 컴포넌트 추가
 */

export default function Waves() {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      <div className="wave wave1"></div>
      <div className="wave wave2"></div>
      <div className="wave wave3"></div>
    </div>
  );
}
