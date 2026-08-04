# 나의 책장

Next.js + Supabase로 만든 실제 웹 서비스예요. 아이디로 회원가입/로그인해서
들어가면 "OO님의 책장"(닉네임)이 뜨고, 책장 / 연도별 탭에서 자신의 책 기록을
볼 수 있어요. 독서 노트는 노션처럼 굵게/제목/불릿/토글을 쓸 수 있어요.

## 1. Supabase 프로젝트 준비

1. https://supabase.com 에서 무료 프로젝트를 하나 만들어요.
2. 좌측 메뉴 **SQL Editor**에서 아래 파일들을 순서대로 붙여넣고 실행해요.
   - `supabase/schema.sql` (`books`, `profiles` 테이블 + 권한 정책 전체)
3. 좌측 메뉴 **Storage** → **New bucket** →
   - 이름: `covers`
   - **Public bucket**: 켜기
   로 버킷을 하나 만들어요. (표지 이미지 저장용)
4. **Authentication → Providers**에서 Email이 켜져 있는지 확인해요.
   테스트를 빠르게 하고 싶다면 **Authentication → Settings**에서
   "Confirm email"을 잠시 꺼둬도 괜찮아요 (실제 서비스에서는 켜두는 걸 추천해요).
5. **Project Settings → API Keys**에서 아래 두 값을 복사해요.
   - Project URL
   - Publishable key (예전 이름: anon public key)

## 2. 로컬에서 실행하기

```bash
npm install
cp .env.local.example .env.local
# .env.local 파일을 열어서 위에서 복사한 값 두 개를 붙여넣기
npm run dev
```

http://localhost:3000 접속 → 회원가입(아이디·닉네임·이메일·비밀번호) →
로그인(아이디·비밀번호) → 책장 시작!

## 3. 실제 배포하기 (Vercel 추천)

1. 이 폴더를 GitHub 저장소로 올려요.
2. https://vercel.com 에서 "New Project" → 방금 만든 저장소 선택.
3. **Environment Variables**에 `.env.local`에 넣었던 두 값을 똑같이
   추가해요 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy 누르면 몇 분 안에 실제 주소(`https://xxx.vercel.app`)로
   서비스가 열려요. 이후로는 깃허브에 푸시할 때마다 자동으로 재배포돼요.

## 폴더 구조

```
app/
  page.js              로그인 여부에 따라 /login 또는 /shelf 로 이동
  login/page.js        로그인(아이디+비번) / 회원가입(아이디+닉네임+이메일+비번)
  shelf/page.js         메인 화면: 헤더, 탭, 책장/연도별, 책 등록·수정
  shelf/NoteEditor.js   노션 스타일 리치텍스트 독서 노트 에디터
lib/
  supabaseClient.js     Supabase 클라이언트 설정
  constants.js          색깔 팔레트, 상태 라벨, 날짜/색상 계산 로직
  tiptapToggle.js        토글(접었다 펼치는 블록) 커스텀 에디터 확장
supabase/
  schema.sql             DB 테이블 + 파일 업로드 권한 정책 (신규 설치용, 전체 포함)
  migration_genre.sql        장르 기능 마이그레이션 (기존 프로젝트용)
  migration_username_login.sql  아이디 로그인 + 닉네임 마이그레이션 (기존 프로젝트용)
  migration_price.sql        가격 필드 마이그레이션 (기존 프로젝트용)
  migration_current_page.sql 읽는 중인 책의 현재 페이지 마이그레이션 (기존 프로젝트용)
```

## 이미 앱을 쓰고 계셨다면 (마이그레이션)

이전 버전에서 이미 Supabase 프로젝트를 만들어 쓰고 계셨다면, 아래 파일들을
SQL Editor에서 **순서대로** 실행해주세요 (이미 실행한 적 있는 파일은 다시 안 해도 돼요).

1. `supabase/migration_genre.sql`
2. `supabase/migration_username_login.sql`
3. `supabase/migration_price.sql`
4. `supabase/migration_current_page.sql`

**주의**: 아이디 로그인 마이그레이션을 실행해도 이미 가입된 기존 계정에는
아이디/닉네임이 없어요 (새 가입자부터 자동으로 생겨요). 기존 계정으로 계속
로그인하려면, **Authentication → Users**에서 본인 계정의 User UID를 확인한 뒤,
SQL Editor에서 아래처럼 프로필을 직접 만들어주세요 (원하는 값으로 바꿔서):

```sql
insert into public.profiles (id, username, nickname)
values ('여기에-User-UID-붙여넣기', '원하는아이디', '원하는닉네임');
```

노트 편집기가 바뀌었지만 예전에 일반 텍스트로 써둔 노트는 자동으로 인식해서
그대로 보여주고, 편집하면 새 형식으로 저장돼요. 별도 데이터 마이그레이션은
필요 없어요.

## 참고

- 표지 이미지는 파일로 업로드하면 Supabase Storage의 `covers` 버킷에
  저장되고, 공개 URL이 책 정보에 함께 저장돼요.
- 책 색깔은 파스텔 9색 중에서 고를 수 있어요.
- 장르는 직접 입력하고 색을 고르면, 같은 장르를 다시 쓸 때 자동으로 같은 색이 적용돼요.
- 연도 필터(책장 탭)와 연도별 탭은 "다 읽었어요" 상태이면서 완독일이 있는 책만 집계해요.
- 독서 노트는 굵게, 제목(H2/H3), 불릿 목록, 토글 블록을 지원해요. 박스 테두리 없이
  페이지 전체 너비로 넓게 써요.
- 회원가입은 아이디·닉네임·이메일·비밀번호를 받고, 로그인은 아이디·비밀번호만
  필요해요. 아이디는 영문/숫자/밑줄 3~20자이고 중복될 수 없어요. 닉네임이
  "OO님의 책장"에 표시돼요.
- 탭은 책장 / 연도별 / 장르별 / 통계 네 개예요. 장르별 탭은 장르마다 책을 묶어서
  보여주고(장르 없는 책은 "미분류"로 모여요), 통계 탭은 전체·장르별·연도별 통계를
  한 곳에서 보여줘요.
- 쪽수·가격은 선택 입력이에요. 둘 다 채워두면 상단 카드에 "총 N쪽 · N원어치 읽음"이
  작게 뜨고, 통계 탭에서 연도별로도 같은 걸 볼 수 있어요. 둘 다 "다 읽었어요" 상태인
  책만 집계돼요.
