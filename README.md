# MUMY LOG

React, TypeScript, Vite 기반의 목 데이터 프로토타입입니다. Node.js 24와 npm을 사용합니다.

## 로컬 실행

```sh
npm ci
npm run dev
```

개발 서버는 기본적으로 `http://localhost:5173`에서 실행됩니다. `npm run build`는 타입 검사 후 `dist/`에 배포 파일을 생성합니다. `npm run preview`로 빌드 결과를 확인할 수 있습니다.

프로토타입 화면은 `src/App.tsx`에서 시작합니다. 기능을 구현할 때 사용할 목 데이터는 `src/mocks/`에 추가합니다.

## Vercel 배포

GitHub에 첫 커밋을 푸시한 뒤 Vercel에서 **Add New → Project**를 선택하고 `yeji-dev25/MUMY-LOG` 저장소를 가져옵니다. 루트 디렉터리는 저장소 루트이며, 프리셋은 **Vite**, 빌드 명령은 `npm run build`, 출력 디렉터리는 `dist`입니다. 초기 상태에서는 환경 변수가 필요하지 않습니다.
