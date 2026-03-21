# 업데이트 알림 기능

앱 시작 시 GitHub Releases API를 통해 최신 버전을 확인하고, 새 버전이 있을 때 사용자에게 배너로 알려주는 기능입니다.
다운로드나 자동 설치는 하지 않으며, 사용자가 직접 GitHub Release 페이지에서 받을지 여부를 결정합니다.

## 동작 흐름

```
앱 시작
  → 렌더러 로드 완료 후 5초 대기
  → GitHub API (api.github.com/repos/hyunseo2512/Glot/releases/latest) 호출
  → 응답의 tag_name을 현재 app.getVersion()과 비교
  → 버전이 다르면 → 렌더러에 'update:available' IPC 이벤트 전송
  → UpdateBanner 컴포넌트가 화면 상단에 배너 표시
  → 사용자가 "릴리즈 노트 보기" 클릭 → GitHub Release 페이지 브라우저로 열림
  → 사용자가 "✕" 클릭 → 배너 닫힘 (재시작 전까지 다시 표시 안 됨)
```

개발 모드(`isDev === true`)에서는 버전 체크를 실행하지 않습니다.

---

## 변경된 파일

### `src/main/main.ts`

**추가 내용**

1. `import` 구문에 `net` 추가
   ```ts
   import { app, BrowserWindow, ipcMain, Menu, net } from 'electron';
   ```

2. `checkForUpdates(win: BrowserWindow)` 함수 추가 (`app.whenReady()` 바로 위에 위치)
   - `net.request`로 GitHub Releases API 호출
   - 현재 버전(`app.getVersion()`)과 최신 버전(`tag_name`) 비교
   - 버전이 다르면 `win.webContents.send('update:available', { version, url })` 호출
   - 네트워크 오류, JSON 파싱 오류 모두 조용히 무시

3. `createWindow()` 내부, `win.once('ready-to-show')` 아래에 호출 코드 추가
   ```ts
   win.webContents.once('did-finish-load', () => {
     setTimeout(() => checkForUpdates(win), 5000);
   });
   ```

---

### `src/main/preload.ts`

**추가 내용**

`contextBridge.exposeInMainWorld` 객체에 `update` 항목 추가:
```ts
update: {
  onAvailable: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('update:available', listener);
    return () => ipcRenderer.removeListener('update:available', listener);
  },
},
```
렌더러에서 `window.electron.update.onAvailable(cb)` 형태로 사용하며, 반환값(cleanup 함수)을 useEffect cleanup에서 호출해 리스너를 정리합니다.

---

### `src/renderer/global.d.ts`

**추가 내용**

`Window.electron` 타입 정의에 `update` 항목 추가:
```ts
update: {
  onAvailable: (callback: (info: { version: string; url: string }) => void) => (() => void);
};
```

---

### `src/renderer/components/UpdateBanner.tsx` (신규 파일)

업데이트 알림 배너 컴포넌트입니다.

- `useEffect`에서 `window.electron.update.onAvailable` 구독
- 새 버전 정보(`{ version, url }`)가 수신되면 state에 저장하고 배너 렌더링
- **릴리즈 노트 보기**: `window.electron.shell.openExternal(url)`로 GitHub Release 페이지를 시스템 브라우저로 열기
- **✕ 닫기**: state를 null로 초기화, 배너 제거 (앱 재시작 전까지 다시 표시 안 됨)
- `updateInfo === null`이면 `null` 반환 (렌더링 없음)

---

### `src/renderer/App.tsx`

**추가 내용**

1. `UpdateBanner` import 추가:
   ```ts
   import UpdateBanner from './components/UpdateBanner';
   ```

2. 메인 return 문 내부, `<GlobalTooltip />` 바로 아래에 배치:
   ```tsx
   <UpdateBanner />
   ```
   헤더(`<header className="app-header">`) 위에 위치하여 화면 최상단에 표시됩니다.

---

## 배포 시 주의사항

- GitHub Repository의 Release를 생성할 때 태그 이름을 `v{version}` 형식으로 맞춰야 합니다 (예: `v0.2.0`)
- `package.json`의 `version` 필드가 현재 배포 버전과 일치해야 합니다
- 새 버전 배포 시 `package.json`의 `version`을 올린 뒤 빌드 & GitHub Release 생성하면 기존 사용자에게 자동으로 알림이 표시됩니다
