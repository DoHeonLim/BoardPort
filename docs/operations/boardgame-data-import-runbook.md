# 보드게임 데이터 import 운영 기준

BoardPort 보드게임 도감 데이터는 원천 메타데이터와 한국어 검수 데이터를 분리해 import합니다. 한 번에 공개 데이터로 밀어 넣기보다, 원천 수집과 한국어 검수를 나눠 데이터 품질을 관리하는 쪽을 선택했습니다.

## 1. 원칙

- CSV 원본 파일은 저장소에 커밋하지 않음
- Kaggle CSV 기반 BGG 구조화 메타데이터는 초기 적재용 기준 데이터로만 사용
- 한국어 제목, 별칭, 설명은 관리자 검수 후 공개
- `PUBLISHED` 상태만 사용자 화면에 노출
- 장문 description, 쇼핑몰 설명, 룰북 본문은 저장하지 않음

## 2. 작업 순서

1. 원천 보드게임 CSV import
2. 한국어 검수 CSV import
3. 메커니즘 relation CSV import
4. 카테고리 relation CSV import
5. taxonomy 한국어명 CSV import
6. 검수 완료 항목 공개

## 3. CSV별 역할

- 원천 CSV: BGG ID, 원제, 이미지, 인원, 시간, 난이도, 평점
- 한국어 검수 CSV: 한국어 제목, 별칭, 짧은 설명, 검색 키워드, 상태
- 메커니즘/카테고리 CSV: 보드게임과 taxonomy 연결
- taxonomy 한국어명 CSV: 분류 표시명 보강

## 4. 공개 전 확인

- 한국어 locale 존재 여부
- 검색 키워드와 별칭 확인
- PUBLISHED 상태만 공개되는지 확인
- 도감 상세에서 관련 상품/게시글/방송 연결 확인
- 출처 안내와 BGG 링크 확인

## 5. 실패 및 재실행 기준

- import 전에는 대상 CSV와 실행 환경을 확인
- 동일 BGG ID가 이미 존재하는 경우 새 레코드를 중복 생성하지 않고 기존 메타데이터 갱신 기준을 따름
- 한국어 검수 CSV import 실패 시 공개 상태를 변경하지 않음
- 메커니즘/카테고리 연결 import 실패 시 해당 taxonomy 연결만 재실행할 수 있어야 함
- 부분 실패가 발생하면 관리자 화면에서 `PUBLISHED` 전환 전 누락 항목을 확인

## 6. 관련 문서

- [보드게임 도감 데이터/화면 설계](../design/boardgame-catalog-design.md)
