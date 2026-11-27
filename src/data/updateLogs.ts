import generatedLogs from './generatedLogs.json';

export interface UpdateChangeItem {
  category: string;
  items: string[];
}

export interface UpdateLog {
  version: string;
  title: string;
  releaseDate: string;
  isLatest?: boolean;
  tag: '대규모 업데이트' | '기능 추가' | '디자인 개선' | '버그 수정' | '최적화 및 보안';
  tagColor: 'violet' | 'emerald' | 'blue' | 'amber' | 'rose';
  summary: string;
  highlights: string[];
  details: UpdateChangeItem[];
}

const MANUAL_UPDATE_LOGS: UpdateLog[] = [
  {
    version: 'v2.0.0',
    title: 'AllDesk 2.0 정식 릴리즈 & 실시간 업데이트 알림 센터 구축',
    releaseDate: '2026-11-25',
    isLatest: (generatedLogs as UpdateLog[]).length === 0,
    tag: '대규모 업데이트',
    tagColor: 'violet',
    summary: '파일편집소(자동 누끼 따기, PDF 그림판 주석) 완성 기념 정식 2.0 버전 출시 및 버전 업데이트 알림 센터가 도입되었습니다.',
    highlights: [
      '업데이트 시 자동으로 변경 사항을 알려주는 스마트 업데이트 로그 팝업 탑재',
      'v1.0.0부터 최신 v2.0.0까지의 전체 업데이트 히스토리 상시 열람 지원',
      '상단 바 및 사이드바에 실시간 버전(v2.0.0) 알림 배지 및 벨 아이콘 추가',
      '다시 보지 않기 및 로컬 저장 기능으로 쾌적한 작업 환경 보장'
    ],
    details: [
      {
        category: '🔔 업데이트 알림 센터',
        items: [
          '새로운 기능 및 패치가 출시될 때마다 자동으로 업데이트 안내 팝업이 노출됩니다.',
          '팝업 하단에서 과거 모든 버전의 상세 변경 내역(체인지로그)을 한눈에 확인할 수 있습니다.',
          '상단 헤더의 [✨ v2.0.0 업데이트] 배지 또는 사이드바의 버전 버튼을 눌러 언제든 다시 확인할 수 있습니다.'
        ]
      },
      {
        category: '🎨 파일 편집소 올인원 완성',
        items: [
          'PNG & 사진 편집기와 PDF 문서 편집기가 독립된 하위 작업실로 완전히 분리 구축되었습니다.',
          '100% 브라우저 로컬 구동으로 서버 업로드 없이 완벽한 개인정보 보안을 유지합니다.'
        ]
      }
    ]
  },
  {
    version: 'v1.9.1',
    title: 'PDF 내보내기 런타임 안정화 및 회전 각도 결함 패치',
    releaseDate: '2026-11-24',
    tag: '버그 수정',
    tagColor: 'rose',
    summary: 'PDF 페이지 회전 및 주석 합성 후 새 PDF 다운로드 시 발생하던 회전 각도 타입 오류를 긴급 수정하였습니다.',
    highlights: [
      'pdf-lib 라이브러리의 degrees 회전 각도 래퍼 정식 적용',
      '다중 페이지 일괄 회전 및 개별 90도 회전 정상화',
      '주석이 포함된 고화질 PDF 내보내기 100% 정상 작동'
    ],
    details: [
      {
        category: '📄 PDF 엔진 버그 픽스',
        items: [
          'PDF 내보내기 시 발생하던 Invalid rotation: {"angle":0,"type":0} 오류 완전 해결',
          '워터마크 각도(35도 기울기) 및 페이지별 90도/180도/270도 회전 처리 호환성 강화'
        ]
      }
    ]
  },
  {
    version: 'v1.9.0',
    title: 'PDF 페이지별 2.0x 듀얼레이어 그림판 & 주석 스튜디오 탑재',
    releaseDate: '2026-11-24',
    tag: '기능 추가',
    tagColor: 'emerald',
    summary: '어떤 PDF 문서든 원하는 페이지의 어느 위치에나 자유롭게 필기하고 주석을 달 수 있는 전용 그림판 스튜디오가 추가되었습니다.',
    highlights: [
      '페이지별 [🎨 그림판 / 주석 쓰기] 독립 스튜디오 모달 지원',
      '자유 펜, 형광펜(하이라이트), 화이트(수정액), 텍스트 주석 메모',
      '네모 박스, 화살표 지시선, 개인정보 픽셀 모자이크 블러',
      '원본 벡터 손상 없는 무손실 투명 PNG 오버레이 합성 내보내기'
    ],
    details: [
      {
        category: '🖌️ PDF 그림판 주석 도구',
        items: [
          '고해상도 2.0x 렌더링으로 작은 글씨 위에도 정밀한 필기와 서명이 가능합니다.',
          '형광펜 도구로 문서를 반투명하게 하이라이트할 수 있습니다.',
          '화이트(수정액) 도구로 지우고 싶은 텍스트나 항목을 흰색으로 깔끔하게 마스킹할 수 있습니다.',
          '모자이크 도구로 주민등록번호, 계좌번호 등 민감 정보를 원클릭 블러 처리할 수 있습니다.',
          '단축키 실행 취소(Ctrl+Z) 및 다시 실행(Ctrl+Y)을 완벽 지원합니다.'
        ]
      }
    ]
  },
  {
    version: 'v1.8.0',
    title: '스마트 원클릭 자동 누끼(배경 분리) & 🪄 마술봉 누끼 도구',
    releaseDate: '2026-11-24',
    tag: '기능 추가',
    tagColor: 'emerald',
    summary: 'PNG 및 사진에서 인물/사물만 남기고 배경을 투명하게 분리해주는 자동 누끼 및 마술봉 도구가 탑재되었습니다.',
    highlights: [
      '✨ 원클릭 자동 누끼: 사진 외곽 배경색을 자동 감지하여 버튼 한 번으로 배경 제거',
      '🪄 마술봉 누끼: 원하는 지점을 클릭하면 연결된 동일 색상 영역을 즉시 투명화',
      '누끼 감도 슬라이더(10~80): 정밀도 및 오차 허용 범위 자유 조절',
      '투명 체커보드 실시간 프리뷰 및 무손실 투명 PNG 다운로드'
    ],
    details: [
      {
        category: '🪄 스마트 누끼(배경 제거)',
        items: [
          '외곽 테두리 픽셀 샘플링 및 유클리드 색상 거리 flood-fill 알고리즘 탑재',
          '자연스러운 테두리를 위한 알파 페더링(Feathering) 경계 스무딩 처리',
          '팔 사이, 배경 틈새 등 닫힌 영역도 마술봉으로 손쉽게 클릭 제거',
          '모든 연산이 100% 브라우저 메모리 상에서 이루어져 서버 전송이 전혀 없습니다.'
        ]
      }
    ]
  },
  {
    version: 'v1.7.0',
    title: 'Netlify HUD 워터마크 배지 완전 차단 및 오프라인 보안 강화',
    releaseDate: '2026-11-24',
    tag: '최적화 및 보안',
    tagColor: 'blue',
    summary: '호스팅 환경에서 강제로 주입되던 외부 워터마크 배지를 4중 차단 필터로 완전히 무력화하였습니다.',
    highlights: [
      '엣지 스크립트 리다이렉트 무력화 (_redirects, netlify.toml)',
      '<head> 전역 CSS 오버라이드 및 DOM MutationObserver 실시간 박멸기',
      '방문자 화면에 유료 업그레이드 배지가 노출되지 않도록 영구 차단'
    ],
    details: [
      {
        category: '🛡️ 워터마크 차단',
        items: [
          'Netlify 에지 서버에서 주입하던 /.netlify/scripts/hud 스크립트를 빈 파일로 우회 처리',
          'DOM에 동적 생성되는 #nl-badge-frame을 생성 즉시 감지하여 자동 삭제'
        ]
      }
    ]
  },
  {
    version: 'v1.6.0',
    title: '구글 애드센스(AdSense) 정식 준비 및 법적 필수 페이지 신설',
    releaseDate: '2026-11-22',
    tag: '기능 추가',
    tagColor: 'violet',
    summary: '웹사이트 공식 수익화 및 신뢰성 확보를 위한 구글 애드센스 심사 인프라를 구축하였습니다.',
    highlights: [
      '구글 애드센스 공식 메타 태그 및 ads.txt 연동 완료',
      '법적 필수 페이지 신설: 개인정보처리방침(/privacy), 서비스 이용약관(/terms), 소개(/about)',
      '검색엔진 크롤링 최적화: robots.txt, sitemap.xml 생성',
      '안전하고 반응형 레이아웃을 해치지 않는 애드센스 배너 유닛 구현'
    ],
    details: [
      {
        category: '📜 법적 및 신뢰성 페이지',
        items: [
          '모든 파일 처리가 브라우저 내부에서만 수행됨을 명시한 개인정보처리방침 작성',
          '노션 스타일 디자인의 신뢰성 높은 서비스 이용약관 및 서비스 소개 페이지 제공'
        ]
      }
    ]
  },
  {
    version: 'v1.5.0',
    title: 'PNG 무손실 투명 편집기 & 사진 자르기/도형/모자이크 스튜디오',
    releaseDate: '2026-11-22',
    tag: '기능 추가',
    tagColor: 'emerald',
    summary: 'PNG의 알파 채널(투명도)을 100% 보존하면서 자유롭게 그리고 자르고 마스킹할 수 있는 사진 편집기가 도입되었습니다.',
    highlights: [
      'PNG 투명도 유지 파이프라인 및 체커보드 배경 모드',
      '투명 지우개: 지운 영역이 투명해지는 알파 지우개',
      '비율별 사진 자르기(Crop) 프리셋 (1:1, 4:3, 16:9, 3:4, 9:16, 자유)',
      '네모 박스, 화살표, 텍스트 삽입, 모자이크 블러, 단축키 실행 취소(Ctrl+Z)'
    ],
    details: [
      {
        category: '🖼️ PNG 편집 도구',
        items: [
          '편집 후에도 배경 투명도가 날아가지 않고 온전히 유지되는 PNG 다운로드 지원',
          '자유 그리기 펜, 반투명 형광펜, 개인정보 모자이크 블러 기능 탑재',
          '좌우/상하 반전, 90도 회전, 밝기·대비·채도 필터 및 흑백/세피아 톤 변환'
        ]
      }
    ]
  },
  {
    version: 'v1.4.0',
    title: '진짜 노션 하위 페이지(Sub-pages) 아키텍처 및 실시간 URL 라우팅',
    releaseDate: '2026-11-22',
    tag: '디자인 개선',
    tagColor: 'blue',
    summary: '노션과 동일한 계층형 하위 페이지 구조와 실제 브라우저 주소창 URL 연동 시스템이 구축되었습니다.',
    highlights: [
      '사이드바 계층형 트리 메뉴 (파일 편집소 ➔ PNG 편집기, PDF 편집기)',
      '진짜 URL 라우팅 (/editor, /editor/image, /editor/pdf)',
      '브라우저 뒤로가기 / 앞으로가기 (History API) 완벽 연동',
      '상단 계층형 브레드크럼(Breadcrumb) 경로 네비게이션'
    ],
    details: [
      {
        category: '🧭 네비게이션 및 아키텍처',
        items: [
          '상위 페이지인 [파일 편집소]에서 하위 작업실을 한눈에 보고 진입할 수 있는 허브 페이지 추가',
          '새로고침을 하거나 특정 URL로 직접 접속해도 해당 하위 작업 공간이 그대로 유지'
        ]
      }
    ]
  },
  {
    version: 'v1.3.0',
    title: '브랜드 리뉴얼(AllDesk) 및 스마트 금융·텍스트 생산성 도구함 확장',
    releaseDate: '2026-11-21',
    tag: '기능 추가',
    tagColor: 'emerald',
    summary: '브랜드를 AllDesk(올데스크)로 공식 확정하고, 일상에 필요한 금융 계산기와 텍스트 도구를 대폭 추가하였습니다.',
    highlights: [
      '복리 계산기, 예적금 이자 계산기, 대출 원리금 균등상환 계산기 추가',
      '실시간 글자수 세기(공백 포함/제외, 단어수, 바이트수, 예상 읽는 시간)',
      '맞춤법/단어 치환기 및 마크다운(Markdown) 실시간 뷰어 탑재'
    ],
    details: [
      {
        category: '🛠️ 스마트 생산성 도구',
        items: [
          '복리 투자 수익률 계산 및 월별 복리 시뮬레이션 지원',
          '글자수 세기 도구에서 공백 포함/제외 글자수와 자기소개서 바이트 단위 실시간 계산'
        ]
      }
    ]
  },
  {
    version: 'v1.2.0',
    title: '프로그램 원클릭 설치 마법사 고도화 (인기 앱 30종 확장)',
    releaseDate: '2026-11-07',
    tag: '기능 추가',
    tagColor: 'emerald',
    summary: '새 PC를 맞추거나 포맷했을 때 필수 프로그램을 원클릭으로 일괄 설치할 수 있는 마법사 기능이 대폭 강화되었습니다.',
    highlights: [
      '3단계 직관적인 마법사 위저드 (카테고리 ➔ 앱 선택 ➔ 원클릭 실행)',
      '카테고리별 인기 프로그램 30종 이상 확장 (Chrome, VSCode, 카카오톡 등)',
      'Windows Winget 연동 배치 스크립트(실행하기.bat) 자동 생성 및 네이티브 브릿지 지원'
    ],
    details: [
      {
        category: '📦 설치 마법사',
        items: [
          '개발자, 사무직, 게이머, 학생 등 용도별 맞춤 프리셋 제공',
          '사용자가 원하는 프로그램만 콕 집어 한 번에 자동 설치 가능'
        ]
      }
    ]
  },
  {
    version: 'v1.1.0',
    title: 'Notion(노션) 스타일 감성 UI/UX 전면 개편 & 다크 모드',
    releaseDate: '2026-10-29',
    tag: '디자인 개선',
    tagColor: 'blue',
    summary: '작업에 몰입할 수 있도록 미니멀하고 단정한 노션 스타일 디자인 시스템과 완벽한 다크 모드를 적용하였습니다.',
    highlights: [
      '노션 스타일 접이식 사이드바 및 미니멀 상단 네비게이션 탑재',
      '눈이 편안한 딥 다크 모드 및 라이트 모드 전환',
      '100% 브라우저 로컬 안전 처리로 모든 파일 오프라인 보안 처리'
    ],
    details: [
      {
        category: '🎨 UI/UX 개편',
        items: [
          '모든 아이콘과 타이포그래피를 노션 고유의 모던한 느낌으로 통일',
          '모바일 화면에서도 편리하게 쓸 수 있는 반응형 서랍형 사이드바 구현'
        ]
      }
    ]
  },
  {
    version: 'v1.0.0',
    title: 'AllDesk (올데스크) 최초 출시',
    releaseDate: '2026-10-28',
    tag: '대규모 업데이트',
    tagColor: 'violet',
    summary: '누구나 브라우저만 켜면 무료로 사용할 수 있는 올인원 생산성 데스크 플랫폼 AllDesk가 첫선을 보였습니다.',
    highlights: [
      '파일 용량 압축기 (PDF, 이미지, 영상 용량 최적화)',
      '파일 형식 변환기 (WebP, PNG, JPG, PDF 등)',
      '영상 및 음악 포맷 변환기 (MP4, MP3, WebM)',
      '스마트 계산기 및 재미 도구함'
    ],
    details: [
      {
        category: '🚀 최초 런칭 기능',
        items: [
          '클라이언트 사이드 Canvas / WebAssembly 기반 고속 파일 압축 및 변환',
          '다양한 일상 유틸리티 도구들을 하나의 웹사이트로 통합'
        ]
      }
    ]
  }
];

export const ALL_UPDATE_LOGS: UpdateLog[] = [
  ...(generatedLogs as UpdateLog[]),
  ...MANUAL_UPDATE_LOGS,
];

export const CURRENT_VERSION = ALL_UPDATE_LOGS[0]?.version ?? 'v2.0.0';
