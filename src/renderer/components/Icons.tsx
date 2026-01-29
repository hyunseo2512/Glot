/**
 * 공통 SVG 아이콘 컴포넌트
 */

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}



// 전송 아이콘


// 로딩 아이콘
export const LoaderIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ animation: 'spin 1s linear infinite' }}
  >
    <line x1="12" y1="2" x2="12" y2="6"></line>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
    <line x1="2" y1="12" x2="6" y2="12"></line>
    <line x1="18" y1="12" x2="22" y2="12"></line>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
  </svg>
);

// 터미널 아이콘
export const TerminalIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>
);

// 플러스 아이콘 (탭 추가용)
export const PlusCircleIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="16"></line>
    <line x1="8" y1="12" x2="16" y2="12"></line>
  </svg>
);

// X 아이콘 (탭 닫기용)
export const XIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// 줌 확대 아이콘
export const ZoomInIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    <line x1="11" y1="8" x2="11" y2="14"></line>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
);

// 플러스 아이콘
export const PlusIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

// 마이너스 아이콘
export const MinusIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

// 초기화(Reset) 아이콘
// 초기화(Reset) 아이콘 (Undo)
export const RotateCcwIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
  </svg>
);

// 재실행(Redo) 아이콘
export const RotateCwIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="23 4 23 10 17 10"></polyline>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
  </svg>
);

// 원격 창 아이콘
export const RemoteIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 6l6 6-6 6"></path>
    <path d="M9 18l-6-6 6-6"></path>
  </svg>
);

// Activity 아이콘 (bi-activity)
export const ActivityIcon = ({ size = 16, className = '', style = {} }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="currentColor"
    className={`bi bi-activity ${className}`}
    viewBox="0 0 16 16"
    style={style}
  >
    <path fillRule="evenodd" d="M6 2a.5.5 0 0 1 .47.33L10 12.036l1.53-4.208A.5.5 0 0 1 12 7.5h3.5a.5.5 0 0 1 0 1h-3.15l-1.88 5.17a.5.5 0 0 1-.94 0L6 3.964 4.47 8.171A.5.5 0 0 1 4 8.5H.5a.5.5 0 0 1 0-1h3.15l1.88-5.17A.5.5 0 0 1 6 2" />
  </svg>
);


// 왼쪽 사이드바 토글 아이콘
export const SidebarLeftIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="9" y1="3" x2="9" y2="21"></line>
  </svg>
);

// 하단 패널 토글 아이콘
export const LayoutBottomIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="3" y1="15" x2="21" y2="15"></line>
  </svg>
);

// 오른쪽 사이드바(AI 패널) 토글 아이콘
export const SidebarRightIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="15" y1="3" x2="15" y2="21"></line>
  </svg>
);

// 종이클립(첨부) 아이콘
export const PaperclipIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>
);

// 마이크 아이콘
export const MicIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

// 히스토리(시계) 아이콘
export const HistoryIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
// 위쪽 화살표 (최대화)
export const ChevronUpIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

// 아래쪽 화살표 (복원/최소화)
export const ChevronDownIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

// 왼쪽 화살표
export const ChevronLeftIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

// 오른쪽 화살표
export const ChevronRightIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

// 이동(Move)용 왼쪽 화살표
export const ArrowLeftIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdArrowBack} size={size} className={className} />
);

// 이동(Move)용 오른쪽 화살표
export const ArrowRightIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdArrowForward} size={size} className={className} />
);

// 분할(Split) 아이콘
export const SplitIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdVerticalSplit} size={size} className={className} />
);

// 단일(Single) 아이콘 (또는 닫기/병합 의미) -> 사각형 or Close
export const SingleIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdCheckBoxOutlineBlank} size={size} className={className} />
);

// Import Simple Icons
import {
  siJavascript,
  siTypescript,
  siPython,
  siReact,
  siHtml5,
  siCss,
  siGit,
  siOpenjdk,
  siGithub,
  siGradle,
  siGnubash,
  siZsh,
  siTmux,

  siJson,
  siMarkdown,
  siDocker,
  siC,
  siCplusplus,
  siMysql,
  siReadme,
} from 'simple-icons/icons';

// Import Material Design Icons
import {
  MdFolder,
  MdFolderOpen,
  MdInsertDriveFile,
  MdDescription,
  MdCreateNewFolder,
  MdNoteAdd,
  MdRefresh,
  MdArrowUpward,
  MdArrowDownward,
  MdClose,
  MdAdd,
  MdRemove,
  MdSearch,
  MdSettings,
  MdSend,
  MdOutlineBugReport,
  MdPlayArrow,
  MdHome,
  MdDelete,
  MdPerson,
  MdCloudUpload,
  MdCloudDownload,
  MdExtension,
  MdArrowBack,
  MdArrowForward,
  MdVerticalSplit,
  MdCheckBoxOutlineBlank,
} from 'react-icons/md';

import {
  VscKey,
  VscGear,
} from 'react-icons/vsc';

// --- Simple Icons Helper ---
const SimpleIcon = ({ icon, size = 16, className = '', color }: IconProps & { icon: any, color?: string }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill={color || `#${icon.hex}`}
    style={{ display: 'block' }} // Prevent layout shifts
  >
    <path d={icon.path} />
  </svg>
);

// --- Material Icons Helper ---
const MatIcon = ({ Icon, size = 16, className = '', color, style }: IconProps & { Icon: any, color?: string }) => (
  <Icon size={size} className={className} color={color} style={style} />
);

// 깃허브 아이콘
export const GithubIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siGithub} size={size} className={className} color="currentColor" />
);

// Git 아이콘 (사이드바용)
export const GitIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siGit} size={size} className={className} color="currentColor" />
);

// 전송 아이콘
export const SendIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdSend} size={size} className={className} />
);

// 파일 아이콘
export const FileIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdInsertDriveFile} size={size} className={className} />
);

// 폴더 닫힘 아이콘 (Material Design Flat - Steel Blue)
export const FolderIcon = ({ size = 16, className = '', color }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <path d="M4 4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4H4Z" fill={color || "#4682B4"} />
    <path d="M4 6H10L12 8H20V18H4V6Z" fill={color || "#5A9FD4"} opacity="0.3" />
  </svg>
);

// 폴더 열림 아이콘 (Material Design Flat - Steel Blue)
export const FolderOpenIcon = ({ size = 16, className = '', color }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <path d="M4 4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6H12L10 4H4Z" fill={color || "#4682B4"} opacity="0.5" />
    <path d="M2 10L4 18H20L22 10H2Z" fill={color || "#5A9FD4"} />
  </svg>
);

// 텍스트 파일 아이콘
export const TxtIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdDescription} size={size} className={className} />
);

// 검색 아이콘
export const SearchIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdSearch} size={size} className={className} />
);

// 설정 아이콘
export const SettingsIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdSettings} size={size} className={className} />
);

// 새 파일 아이콘
export const FilePlusIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdNoteAdd} size={size} className={className} />
);

// 새 폴더 아이콘
export const FolderPlusIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdCreateNewFolder} size={size} className={className} />
);

// 업로드 아이콘
export const UploadIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdCloudUpload} size={size} className={className} />
);

// 다운로드 아이콘
export const DownloadIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdCloudDownload} size={size} className={className} />
);

// Extensions 아이콘
export const ExtensionsIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdExtension} size={size} className={className} />
);

// 사용자 아이콘
export const UserIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdPerson} size={size} className={className} />
);

// HTML 아이콘
export const HtmlIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siHtml5} size={size} className={className} />
);

// CSS 아이콘
export const CssIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siCss} size={size} className={className} />
);

// JS 아이콘
export const JsIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siJavascript} size={size} className={className} />
);

// TS 아이콘
export const TsIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siTypescript} size={size} className={className} />
);

// JSX 아이콘
export const JsxIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siReact} size={size} className={className} color="#61DAFB" />
);

// TSX 아이콘
export const TsxIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siReact} size={size} className={className} color="#3178C6" />
);

// Python 아이콘 (공식 로고 - 파란땹/노란녹)
export const PyIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    {/* 파란색 녉 (좌상단) */}
    <path d="M11.914 0C5.82 0 6.2 2.656 6.2 2.656l.007 2.752h5.814v.826H3.9S0 5.789 0 11.969c0 6.18 3.403 5.96 3.403 5.96h2.03v-2.867s-.109-3.402 3.35-3.402h5.767s3.24.052 3.24-3.13V3.202S18.28 0 11.914 0zm-3.21 1.896a1.04 1.04 0 110 2.08 1.04 1.04 0 010-2.08z" fill="#3776AB" />
    {/* 노란색 녉 (우하단) */}
    <path d="M12.086 24c6.094 0 5.714-2.656 5.714-2.656l-.007-2.752h-5.814v-.826h8.121s3.9.445 3.9-5.735c0-6.18-3.403-5.96-3.403-5.96h-2.03v2.867s.109 3.402-3.35 3.402H9.45s-3.24-.052-3.24 3.13v5.328S5.72 24 12.086 24zm3.21-1.896a1.04 1.04 0 110-2.08 1.04 1.04 0 010 2.08z" fill="#FFD43B" />
  </svg>
);

// Java Icon (Coffee Cup)
export const JavaIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#EA2D2E"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
    <line x1="6" y1="1" x2="6" y2="4"></line>
    <line x1="10" y1="1" x2="10" y2="4"></line>
    <line x1="14" y1="1" x2="14" y2="4"></line>
  </svg>
);

// Bash/Shell Icon
export const BashIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siGnubash} size={size} className={className} />
);


// Zsh Icon
export const ZshIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siZsh} size={size} className={className} />
);

// Tmux Icon
export const TmuxIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siTmux} size={size} className={className} color="#1BB91F" />
);

// PowerShell Icon
export const PowerShellIcon = ({ size = 16, className = '' }: IconProps) => (
  <TerminalIcon size={size} className={className} />
);

// JSON Icon ({} 중괄호 스타일, 노란색) - Lucide Braces
export const JsonIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FFD700"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
    <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
  </svg>
);

// Markdown Icon
export const MdIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siMarkdown} size={size} className={className} color="#E3E3E3" />
);


// C 아이콘 (simple-icons 공식 로고)
export const CIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siC} size={size} className={className} />
);

// C++ 아이콘 (simple-icons 공식 로고)
export const CppIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siCplusplus} size={size} className={className} />
);

// 사용되지 않는 구형 MarkdownIcon 제거됨



// Git/Gitignore 아이콘 (Git 로고 스타일)
export const GitIgnoreIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siGit} size={size} className={className} color="#F05032" />
);

// Gradle 아이콘
export const GradleIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siGradle} size={size} className={className} color="#02303A" />
);

// Docker 아이콘
export const DockerIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siDocker} size={size} className={className} />
);

// SQL 아이콘 (Lucide - Database)
import { Database } from 'lucide-react';
export const SqlIcon = ({ size = 16, className = '' }: IconProps) => (
  <Database size={size} className={className} color="#FF9800" />
);
export const XmlIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#e34c26"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="8 8 4 12 8 16" />
    <polyline points="16 8 20 12 16 16" />
    <line x1="14" y1="4" x2="10" y2="20" />
  </svg>
);

// SVG 아이콘
export const SvgIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ffb13b"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="12" cy="12" r="4" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);

// PNG/Image 아이콘
export const PngIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#b957ce"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// React 아이콘
export const ReactIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#61dafb"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="2" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(0 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
  </svg>
);



// 에러 아이콘 (원형 X)
export const ErrorIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#f48771"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line>
    <line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);

// 경고 아이콘 (삼각형 느낌표)
export const WarningIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#cca700"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

/**
 * 파일명에 따라 적절한 아이콘 컴포넌트를 반환하는 헬퍼 함수
 */
export const getIconForFile = (filename: string, size: number = 16) => {
  const basename = filename.split('/').pop()?.split('\\').pop() || filename;
  const ext = basename.split('.').pop()?.toLowerCase();

  if (basename.toLowerCase().includes('gradle')) {
    return <GradleIcon size={size} />;
  }

  // .gluonrules 체크
  if (basename.toLowerCase() === '.gluonrules') {
    return <GluonRulesIcon size={size} />;
  }

  // README 체크
  if (basename.toLowerCase().startsWith('readme')) {
    return <ReadmeIcon size={size} />;
  }

  // .env 파일 체크
  const lowerName = basename.toLowerCase();
  if (lowerName === '.env' || lowerName.startsWith('.env.') || lowerName === '.env.example' || lowerName === '.env.local') {
    return <EnvIcon size={size} />;
  }

  // config 파일 체크
  if (lowerName.endsWith('.config') || lowerName.endsWith('.conf') || lowerName.endsWith('.cfg') || lowerName.endsWith('.ini') || lowerName === '.editorconfig') {
    return <ConfigIcon size={size} />;
  }

  // Dockerfile 체크 (확장자 없이 이름으로 판단)
  if (lowerName === 'dockerfile' || lowerName.startsWith('dockerfile.')) {
    return <DockerIcon size={size} />;
  }
  if (lowerName === 'docker-compose.yml' || lowerName === 'docker-compose.yaml' || lowerName === 'compose.yml' || lowerName === 'compose.yaml') {
    return <DockerIcon size={size} />;
  }

  switch (ext) {
    case 'html':
    case 'htm':
      return <HtmlIcon size={size} />;
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <CssIcon size={size} />;
    case 'js':
    case 'mjs':
    case 'cjs':
      return <JsIcon size={size} />;
    case 'ts':
      return <TsIcon size={size} />;
    case 'tsx':
      return <TsxIcon size={size} />;
    case 'jsx':
      return <JsxIcon size={size} />;
    case 'py':
    case 'pyd':
      return <PyIcon size={size} />;
    case 'pyc':
      return <PycIcon size={size} />;
    case 'java':
    case 'jar':
    case 'class':
      return <JavaIcon size={size} />;
    case 'c':
    case 'h':
      return <CIcon size={size} />;
    case 'cpp':
    case 'hpp':
    case 'cc':
    case 'hh':
      return <CppIcon size={size} />;
    case 'json':
      return <JsonIcon size={size} />;
    case 'sql':
    case 'sqlite':
    case 'mysql':
    case 'pgsql':
      return <SqlIcon size={size} />;
    case 'xml':
    case 'yml':
    case 'yaml':
      return <XmlIcon size={size} />;
    case 'svg':
      return <SvgIcon size={size} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'bmp':
    case 'ico':
    case 'webp':
    case 'tiff':
    case 'tif':
      return <PngIcon size={size} />;
    case 'md':
    case 'markdown':
      return <MdIcon size={size} />;
    case 'txt':
    case 'text':
    case 'log':
      return <TxtIcon size={size} />;
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return <ShellIcon size={size} />;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'ogg':
    case 'aac':
    case 'wma':
      return <AudioIcon size={size} />;
    case 'gitignore':
    case 'gitattributes':
    case 'gitmodules':
    case 'gitkeep':
      return <GitIgnoreIcon size={size} />;
    default:
      return <FileIcon size={size} />;
  }
};

// 쉘 파일 아이콘
export const ShellIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="3" width="20" height="18" rx="3" fill="#2D2D2D" />
    <path d="M6 9l3 3-3 3" stroke="#4EAA25" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 15h5" stroke="#4EAA25" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 오디오 파일 아이콘
export const AudioIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#4A148C" opacity="0.7" />
    <circle cx="10" cy="16" r="2.5" stroke="#CE93D8" strokeWidth="1.5" fill="none" />
    <path d="M12.5 16V7l5 2v4" stroke="#CE93D8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Python 캐시 파일 아이콘 (.pyc) — 흐린 Python
export const PycIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2C8.5 2 6 3.5 6 5.5V8h6v1H5c-2 0-3.5 1.5-3.5 3.5S3 16 5 16h1v-2.5C6 11.5 7.5 10 9.5 10H15c1.5 0 2.5-1 2.5-2.5V5.5C17.5 3.5 15 2 12 2z" fill="#546E7A" opacity="0.5" />
    <path d="M12 22c3.5 0 6-1.5 6-3.5V16h-6v-1h7c2 0 3.5-1.5 3.5-3.5S21 8 19 8h-1v2.5c0 2-1.5 3.5-3.5 3.5H9c-1.5 0-2.5 1-2.5 2.5v2C6.5 20.5 9 22 12 22z" fill="#546E7A" opacity="0.5" />
  </svg>
);

// __pycache__ 디렉토리 아이콘
export const PycacheFolderIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M2 6C2 4.9 2.9 4 4 4h5l2 2h9c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6z" fill="#546E7A" opacity="0.4" />
    <path d="M10 11l2 2-2 2" stroke="#FFD54F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    <path d="M14 15h2" stroke="#FFD54F" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
  </svg>
);

export const PycacheFolderOpenIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M2 6C2 4.9 2.9 4 4 4h5l2 2h9c1.1 0 2 .9 2 2v1H7.5c-1.2 0-2.3.8-2.7 2L2 18V6z" fill="#546E7A" opacity="0.4" />
    <path d="M4.8 11h16.4c.9 0 1.5.8 1.2 1.6l-2.4 7c-.2.5-.7.9-1.2.9H6.8c-.5 0-1-.3-1.2-.9l-2.4-7c-.3-.8.3-1.6 1.2-1.6z" fill="#78909C" opacity="0.4" />
    <path d="M10 14l2 2-2 2" stroke="#FFD54F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    <path d="M14 18h2" stroke="#FFD54F" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
  </svg>
);

// bin 디렉토리 아이콘 (기어/실행)
export const BinFolderIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M2 6C2 4.9 2.9 4 4 4h5l2 2h9c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6z" fill="#5C6BC0" opacity="0.6" />
    <circle cx="12" cy="13" r="3" stroke="#E8EAF6" strokeWidth="1.5" fill="none" opacity="0.8" />
    <path d="M12 9.5v1M12 15.5v1M8.8 11l.9.5M14.3 14.5l.9.5M8.8 15l.9-.5M14.3 11.5l.9-.5" stroke="#E8EAF6" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
  </svg>
);

export const BinFolderOpenIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M2 6C2 4.9 2.9 4 4 4h5l2 2h9c1.1 0 2 .9 2 2v1H7.5c-1.2 0-2.3.8-2.7 2L2 18V6z" fill="#5C6BC0" opacity="0.6" />
    <path d="M4.8 11h16.4c.9 0 1.5.8 1.2 1.6l-2.4 7c-.2.5-.7.9-1.2.9H6.8c-.5 0-1-.3-1.2-.9l-2.4-7c-.3-.8.3-1.6 1.2-1.6z" fill="#7986CB" opacity="0.5" />
    <circle cx="12" cy="15" r="2.5" stroke="#E8EAF6" strokeWidth="1.5" fill="none" opacity="0.7" />
  </svg>
);

// src 디렉토리 아이콘 (코드 브래킷)
export const SrcFolderIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M2 6C2 4.9 2.9 4 4 4h5l2 2h9c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6z" fill="#00897B" opacity="0.6" />
    <path d="M10 11l-2.5 2.5L10 16" stroke="#B2DFDB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    <path d="M14 11l2.5 2.5L14 16" stroke="#B2DFDB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
  </svg>
);

export const SrcFolderOpenIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M2 6C2 4.9 2.9 4 4 4h5l2 2h9c1.1 0 2 .9 2 2v1H7.5c-1.2 0-2.3.8-2.7 2L2 18V6z" fill="#00897B" opacity="0.6" />
    <path d="M4.8 11h16.4c.9 0 1.5.8 1.2 1.6l-2.4 7c-.2.5-.7.9-1.2.9H6.8c-.5 0-1-.3-1.2-.9l-2.4-7c-.3-.8.3-1.6 1.2-1.6z" fill="#26A69A" opacity="0.5" />
    <path d="M10 14l-2 2L10 18" stroke="#B2DFDB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    <path d="M14 14l2 2L14 18" stroke="#B2DFDB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
  </svg>
);

// node_modules 디렉토리 아이콘
export const NodeModulesFolderIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M2 6C2 4.9 2.9 4 4 4h5l2 2h9c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6z" fill="#689F38" opacity="0.5" />
    <path d="M12 10v6M9.5 11.5L12 10l2.5 1.5M9.5 14.5L12 16l2.5-1.5" stroke="#C5E1A5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
  </svg>
);

export const NodeModulesFolderOpenIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M2 6C2 4.9 2.9 4 4 4h5l2 2h9c1.1 0 2 .9 2 2v1H7.5c-1.2 0-2.3.8-2.7 2L2 18V6z" fill="#689F38" opacity="0.5" />
    <path d="M4.8 11h16.4c.9 0 1.5.8 1.2 1.6l-2.4 7c-.2.5-.7.9-1.2.9H6.8c-.5 0-1-.3-1.2-.9l-2.4-7c-.3-.8.3-1.6 1.2-1.6z" fill="#8BC34A" opacity="0.4" />
    <path d="M12 13v5M9.5 14.5L12 13l2.5 1.5" stroke="#C5E1A5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
  </svg>
);

// 디렉토리 아이콘 매칭
export const getIconForFolder = (folderName: string, isOpen: boolean, size: number = 16) => {
  const name = folderName.toLowerCase();
  switch (name) {
    case '__pycache__':
      return isOpen ? <PycacheFolderOpenIcon size={size} /> : <PycacheFolderIcon size={size} />;
    case 'bin':
      return isOpen ? <BinFolderOpenIcon size={size} /> : <BinFolderIcon size={size} />;
    case 'src':
    case 'source':
    case 'sources':
      return isOpen ? <SrcFolderOpenIcon size={size} /> : <SrcFolderIcon size={size} />;
    case 'node_modules':
      return isOpen ? <NodeModulesFolderOpenIcon size={size} /> : <NodeModulesFolderIcon size={size} />;
    default:
      return null;
  }
};

// Gluon Rules 아이콘 (앱 로고 기반)

// .env 파일 아이콘
export const EnvIcon = ({ size = 16, className = '' }: IconProps) => (
  <VscKey size={size} className={className} color="#8BC34A" />
);

// .config 파일 아이콘
export const ConfigIcon = ({ size = 16, className = '' }: IconProps) => (
  <VscGear size={size} className={className} color="#BB86FC" />
);

// README 아이콘
export const ReadmeIcon = ({ size = 16, className = '' }: IconProps) => (
  <SimpleIcon icon={siReadme} size={size} className={className} color="#018EF5" />
);
export const GluonRulesIcon = ({ size = 16, className = '' }: IconProps) => (
  <img
    src="icons/gluon-512.svg"
    width={size}
    height={size}
    className={className}
    alt="Gluon"
    style={{ objectFit: 'contain' }}
  />
);

// 채팅 아이콘 (Ask 모드)
export const ChatBubbleIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

// 벌레 아이콘 (Debug 모드)
export const BugIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdOutlineBugReport} size={size} className={className} />
);

// 무한 아이콘 (Agent 모드)
export const InfinityIcon = ({ size = 16, className = '' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z"></path>
  </svg>
);


// 재생 아이콘 (Run)
export const PlayIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdPlayArrow} size={size} className={className} />
);

// 홈 아이콘 (Welcome)
export const HomeIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdHome} size={size} className={className} />
);

// 업데이트 아이콘
export const UpdateIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdRefresh} size={size} className={className} />
);

// 휴지통 아이콘 (Delete)
export const TrashIcon = ({ size = 16, className = '' }: IconProps) => (
  <MatIcon Icon={MdDelete} size={size} className={className} />
);

