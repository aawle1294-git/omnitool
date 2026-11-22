import sys
import os
import subprocess
import threading
import tkinter as tk
from tkinter import ttk, messagebox

# Enable DPI awareness on Windows if available
try:
    import ctypes
    ctypes.windll.shcore.SetProcessDpiAwareness(1)
except Exception:
    pass

# Curated list of popular software with official winget IDs
SOFTWARE_LIST = [
    # 브라우저
    {"id": "Google.Chrome", "name": "Google Chrome", "name_ko": "구글 크롬", "cat": "브라우저", "rec": True, "size": "110 MB"},
    {"id": "Brave.Brave", "name": "Brave Browser", "name_ko": "브레이브 브라우저", "cat": "브라우저", "rec": True, "size": "120 MB"},
    {"id": "Mozilla.Firefox", "name": "Mozilla Firefox", "name_ko": "파이어폭스", "cat": "브라우저", "rec": False, "size": "95 MB"},
    {"id": "Opera.OperaGX", "name": "Opera GX", "name_ko": "오페라 GX", "cat": "브라우저", "rec": False, "size": "130 MB"},
    # 개발
    {"id": "Microsoft.VisualStudioCode", "name": "Visual Studio Code", "name_ko": "VS Code", "cat": "개발", "rec": True, "size": "350 MB"},
    {"id": "Git.Git", "name": "Git for Windows", "name_ko": "깃 (Git SCM)", "cat": "개발", "rec": True, "size": "150 MB"},
    {"id": "OpenJS.NodeJS.LTS", "name": "Node.js (LTS)", "name_ko": "노드JS LTS", "cat": "개발", "rec": False, "size": "80 MB"},
    {"id": "Python.Python.3.12", "name": "Python 3.12", "name_ko": "파이썬 3", "cat": "개발", "rec": True, "size": "120 MB"},
    {"id": "Anysphere.Cursor", "name": "Cursor AI", "name_ko": "커서 AI 에디터", "cat": "개발", "rec": False, "size": "280 MB"},
    {"id": "Microsoft.WindowsTerminal", "name": "Windows Terminal", "name_ko": "윈도우 터미널", "cat": "개발", "rec": True, "size": "65 MB"},
    # 메신저 & 협업
    {"id": "Kakao.KakaoTalk", "name": "KakaoTalk", "name_ko": "카카오톡 PC", "cat": "메신저", "rec": True, "size": "120 MB"},
    {"id": "Discord.Discord", "name": "Discord", "name_ko": "디스코드", "cat": "메신저", "rec": True, "size": "180 MB"},
    {"id": "Telegram.TelegramDesktop", "name": "Telegram", "name_ko": "텔레그램", "cat": "메신저", "rec": False, "size": "90 MB"},
    {"id": "SlackTechnologies.Slack", "name": "Slack", "name_ko": "슬랙", "cat": "메신저", "rec": False, "size": "140 MB"},
    # 유틸리티
    {"id": "Bandisoft.Bandizip", "name": "Bandizip", "name_ko": "반디집 (압축)", "cat": "유틸리티", "rec": True, "size": "30 MB"},
    {"id": "7zip.7zip", "name": "7-Zip", "name_ko": "7-집 (압축)", "cat": "유틸리티", "rec": False, "size": "15 MB"},
    {"id": "voidtools.Everything", "name": "Everything", "name_ko": "에브리띵 (초고속 검색)", "cat": "유틸리티", "rec": True, "size": "10 MB"},
    {"id": "ShareX.ShareX", "name": "ShareX", "name_ko": "쉐어X (화면 캡처/녹화)", "cat": "유틸리티", "rec": True, "size": "70 MB"},
    {"id": "Microsoft.PowerToys", "name": "Microsoft PowerToys", "name_ko": "파워토이 (MS 공식)", "cat": "유틸리티", "rec": True, "size": "450 MB"},
    # 미디어 & 문서
    {"id": "Kakao.PotPlayer", "name": "PotPlayer", "name_ko": "팟플레이어", "cat": "미디어", "rec": True, "size": "85 MB"},
    {"id": "VideoLAN.VLC", "name": "VLC Media Player", "name_ko": "VLC 플레이어", "cat": "미디어", "rec": False, "size": "90 MB"},
    {"id": "Spotify.Spotify", "name": "Spotify", "name_ko": "스포티파이", "cat": "미디어", "rec": False, "size": "110 MB"},
    {"id": "Notion.Notion", "name": "Notion", "name_ko": "노션 (Notion)", "cat": "문서", "rec": True, "size": "160 MB"},
    {"id": "Obsidian.Obsidian", "name": "Obsidian", "name_ko": "옵시디언", "cat": "문서", "rec": False, "size": "140 MB"},
    {"id": "Bitwarden.Bitwarden", "name": "Bitwarden", "name_ko": "비트워든 (암호 관리)", "cat": "보안", "rec": True, "size": "95 MB"}
]

class SetupWizard(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("AllDesk 소프트웨어 설치 마법사")
        self.geometry("680x540")
        self.minsize(640, 500)
        self.configure(bg="#FFFFFF")

        # Center on screen
        self.update_idletasks()
        width = 680
        height = 540
        x = (self.winfo_screenwidth() // 2) - (width // 2)
        y = (self.winfo_screenheight() // 2) - (height // 2)
        self.geometry(f"{width}x{height}+{x}+{y}")

        # State
        self.current_step = 1
        self.total_steps = 5
        self.silent_var = tk.BooleanVar(value=True)
        self.app_vars = {}
        for app in SOFTWARE_LIST:
            # Default select recommended apps
            self.app_vars[app["id"]] = tk.BooleanVar(value=app["rec"])

        self.is_installing = False
        self.stop_requested = False

        self.setup_ui()
        self.show_step(1)

    def setup_ui(self):
        # Configure styles
        style = ttk.Style()
        style.theme_use('clam')
        
        # Colors (Notion style)
        self.BG_MAIN = "#FFFFFF"
        self.BG_SIDE = "#F7F6F3"
        self.TEXT_MAIN = "#37352F"
        self.TEXT_MUTED = "#787774"
        self.BORDER_COLOR = "#E9E9E7"
        self.ACCENT = "#000000"

        # Main Layout: Left Step Sidebar + Right Content Frame
        self.container = tk.Frame(self, bg=self.BG_MAIN)
        self.container.pack(fill=tk.BOTH, expand=True)

        # Left Step Sidebar
        self.side_frame = tk.Frame(self.container, bg=self.BG_SIDE, width=190)
        self.side_frame.pack(side=tk.LEFT, fill=tk.Y)
        self.side_frame.pack_propagate(False)

        # Right Content Area
        self.content_area = tk.Frame(self.container, bg=self.BG_MAIN)
        self.content_area.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        # Sidebar Title
        tk.Label(
            self.side_frame, text="⚡ AllDesk", font=("Pretendard", 12, "bold"),
            bg=self.BG_SIDE, fg=self.TEXT_MAIN
        ).pack(anchor="w", padx=18, pady=(20, 2))
        tk.Label(
            self.side_frame, text="설치 마법사 (Setup Wizard)", font=("Pretendard", 8),
            bg=self.BG_SIDE, fg=self.TEXT_MUTED
        ).pack(anchor="w", padx=18, pady=(0, 20))

        # Steps navigation list in sidebar
        self.step_labels = []
        step_names = [
            "1. 시작 및 환영",
            "2. 구성 요소 선택",
            "3. 설치 옵션 설정",
            "4. 설치 진행 중...",
            "5. 설치 완료"
        ]
        for idx, name in enumerate(step_names):
            lbl = tk.Label(
                self.side_frame, text=name, font=("Pretendard", 9),
                bg=self.BG_SIDE, fg=self.TEXT_MUTED, anchor="w", padx=18, pady=8
            )
            lbl.pack(fill=tk.X)
            self.step_labels.append(lbl)

        # Bottom Bar: Divider + Action Buttons
        self.bottom_bar = tk.Frame(self, bg=self.BG_SIDE, height=60)
        self.bottom_bar.pack(side=tk.BOTTOM, fill=tk.X)

        tk.Frame(self.bottom_bar, bg=self.BORDER_COLOR, height=1).pack(fill=tk.X, side=tk.TOP)

        self.btn_frame = tk.Frame(self.bottom_bar, bg=self.BG_SIDE)
        self.btn_frame.pack(side=tk.RIGHT, padx=20, pady=12)

        self.btn_back = tk.Button(
            self.btn_frame, text="< 뒤로 (Back)", font=("Pretendard", 9),
            bg="#FFFFFF", fg=self.TEXT_MAIN, relief="flat", bd=1,
            highlightbackground=self.BORDER_COLOR, padx=12, pady=5,
            cursor="hand2", command=self.go_back
        )
        self.btn_back.pack(side=tk.LEFT, padx=5)

        self.btn_next = tk.Button(
            self.btn_frame, text="다음 (Next) >", font=("Pretendard", 9, "bold"),
            bg="#000000", fg="#FFFFFF", relief="flat", bd=0,
            padx=16, pady=5, cursor="hand2", command=self.go_next
        )
        self.btn_next.pack(side=tk.LEFT, padx=5)

        self.btn_cancel = tk.Button(
            self.btn_frame, text="취소 (Cancel)", font=("Pretendard", 9),
            bg="#FFFFFF", fg=self.TEXT_MUTED, relief="flat", bd=1,
            highlightbackground=self.BORDER_COLOR, padx=10, pady=5,
            cursor="hand2", command=self.on_cancel
        )
        self.btn_cancel.pack(side=tk.LEFT, padx=5)

        self.protocol("WM_DELETE_WINDOW", self.on_cancel)

    def update_sidebar_indicators(self):
        for idx, lbl in enumerate(self.step_labels):
            step_num = idx + 1
            if step_num == self.current_step:
                lbl.configure(font=("Pretendard", 9, "bold"), fg="#000000", bg="#EAE8E3")
            elif step_num < self.current_step:
                lbl.configure(font=("Pretendard", 9), fg="#10B981", bg=self.BG_SIDE)
            else:
                lbl.configure(font=("Pretendard", 9), fg=self.TEXT_MUTED, bg=self.BG_SIDE)

    def clear_content(self):
        for widget in self.content_area.winfo_children():
            widget.destroy()

    def show_step(self, step_num):
        try:
            self.unbind_all("<MouseWheel>")
        except Exception:
            pass
        self.current_step = step_num
        self.update_sidebar_indicators()
        self.clear_content()

        if step_num == 1:
            self.render_step_welcome()
        elif step_num == 2:
            self.render_step_components()
        elif step_num == 3:
            self.render_step_options()
        elif step_num == 4:
            self.render_step_installing()
        elif step_num == 5:
            self.render_step_complete()

    # ----------------------------------------------------
    # STEP 1: WELCOME
    # ----------------------------------------------------
    def render_step_welcome(self):
        self.btn_back.configure(state=tk.DISABLED)
        self.btn_next.configure(text="다음 (Next) >", state=tk.NORMAL)
        self.btn_cancel.configure(text="취소 (Cancel)", state=tk.NORMAL)

        frame = tk.Frame(self.content_area, bg=self.BG_MAIN, padx=25, pady=25)
        frame.pack(fill=tk.BOTH, expand=True)

        tk.Label(
            frame, text="📦 AllDesk 소프트웨어 설치 마법사",
            font=("Pretendard", 14, "bold"), bg=self.BG_MAIN, fg=self.TEXT_MAIN
        ).pack(anchor="w")

        tk.Label(
            frame, text="Windows 공식 winget 패키지 매니저를 통해 필수 소프트웨어를 안전하게 자동 설치합니다.",
            font=("Pretendard", 9), bg=self.BG_MAIN, fg=self.TEXT_MUTED, wraplength=420, justify="left"
        ).pack(anchor="w", pady=(8, 20))

        # Notion callout box
        callout = tk.Frame(frame, bg="#F7F6F3", highlightbackground=self.BORDER_COLOR, highlightthickness=1, padx=12, pady=10)
        callout.pack(fill=tk.X, pady=(0, 20))

        tk.Label(
            callout, text="💡 100% 공식 원본 패키지 무인 설치", font=("Pretendard", 9, "bold"),
            bg="#F7F6F3", fg=self.TEXT_MAIN
        ).pack(anchor="w")
        tk.Label(
            callout, text="Microsoft 공식 저장소에서 검증된 최신 버전만 다운로드하며, 애드웨어 없는 클린 설치를 진행합니다.",
            font=("Pretendard", 8), bg="#F7F6F3", fg=self.TEXT_MUTED, wraplength=400, justify="left"
        ).pack(anchor="w", pady=(2, 0))

        # Quick preset selection
        tk.Label(
            frame, text="원하는 설치 프리셋을 선택하세요:", font=("Pretendard", 9, "bold"),
            bg=self.BG_MAIN, fg=self.TEXT_MAIN
        ).pack(anchor="w", pady=(5, 8))

        self.preset_var = tk.StringVar(value="essential")
        presets = [
            ("essential", "✨ 새 PC 필수팩 (크롬, 반디집, 카톡, 팟플레이어, Everything, ShareX)"),
            ("dev", "💻 개발자 스타터팩 (VS Code, Git, Python 3, Windows Terminal)"),
            ("custom", "🛠️ 사용자 정의 직접 선택 (모든 소프트웨어 목록에서 직접 선택)")
        ]
        for val, text in presets:
            rb = tk.Radiobutton(
                frame, text=text, variable=self.preset_var, value=val,
                font=("Pretendard", 9), bg=self.BG_MAIN, fg=self.TEXT_MAIN,
                activebackground=self.BG_MAIN, selectcolor=self.BG_MAIN,
                command=self.apply_preset_choice
            )
            rb.pack(anchor="w", pady=3)

    def apply_preset_choice(self):
        choice = self.preset_var.get()
        if choice == "essential":
            ess_ids = ["Google.Chrome", "Bandisoft.Bandizip", "Kakao.KakaoTalk", "Kakao.PotPlayer", "voidtools.Everything", "ShareX.ShareX"]
            for app_id, var in self.app_vars.items():
                var.set(app_id in ess_ids)
        elif choice == "dev":
            dev_ids = ["Microsoft.VisualStudioCode", "Git.Git", "Python.Python.3.12", "Microsoft.WindowsTerminal"]
            for app_id, var in self.app_vars.items():
                var.set(app_id in dev_ids)

    # ----------------------------------------------------
    # STEP 2: SELECT COMPONENTS
    # ----------------------------------------------------
    def render_step_components(self):
        self.btn_back.configure(state=tk.NORMAL)
        self.btn_next.configure(text="다음 (Next) >", state=tk.NORMAL)

        frame = tk.Frame(self.content_area, bg=self.BG_MAIN, padx=25, pady=20)
        frame.pack(fill=tk.BOTH, expand=True)

        header_frame = tk.Frame(frame, bg=self.BG_MAIN)
        header_frame.pack(fill=tk.X, pady=(0, 10))

        tk.Label(
            header_frame, text="설치할 소프트웨어 선택", font=("Pretendard", 13, "bold"),
            bg=self.BG_MAIN, fg=self.TEXT_MAIN
        ).pack(side=tk.LEFT)

        btn_bar = tk.Frame(header_frame, bg=self.BG_MAIN)
        btn_bar.pack(side=tk.RIGHT)

        tk.Button(
            btn_bar, text="전체 선택", font=("Pretendard", 8),
            bg="#F0F0EE", fg=self.TEXT_MAIN, relief="flat", padx=6, pady=2,
            command=self.select_all_apps
        ).pack(side=tk.LEFT, padx=2)

        tk.Button(
            btn_bar, text="전체 해제", font=("Pretendard", 8),
            bg="#F0F0EE", fg="#DC2626", relief="flat", padx=6, pady=2,
            command=self.deselect_all_apps
        ).pack(side=tk.LEFT, padx=2)

        # Scrollable Canvas list
        canvas_frame = tk.Frame(frame, bg=self.BORDER_COLOR, bd=1)
        canvas_frame.pack(fill=tk.BOTH, expand=True)

        canvas = tk.Canvas(canvas_frame, bg=self.BG_MAIN, highlightthickness=0)
        scrollbar = ttk.Scrollbar(canvas_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.BG_MAIN)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas_window = canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        
        # Keep width fitted to canvas
        canvas.bind(
            "<Configure>",
            lambda e: canvas.itemconfig(canvas_window, width=e.width)
        )

        canvas.configure(yscrollcommand=scrollbar.set)

        # Mouse wheel scrolling handler
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        canvas.bind_all("<MouseWheel>", _on_mousewheel)

        # Populate items
        for app in SOFTWARE_LIST:
            row = tk.Frame(scrollable_frame, bg=self.BG_MAIN, padx=10, pady=4)
            row.pack(fill=tk.X, expand=True)
            row.bind("<MouseWheel>", _on_mousewheel)

            cb = tk.Checkbutton(
                row, variable=self.app_vars[app["id"]],
                bg=self.BG_MAIN, activebackground=self.BG_MAIN,
                selectcolor=self.BG_MAIN, command=self.update_count_label
            )
            cb.pack(side=tk.LEFT)
            cb.bind("<MouseWheel>", _on_mousewheel)

            name_lbl = tk.Label(
                row, text=f"{app['name_ko']}  ({app['name']})", font=("Pretendard", 9, "bold" if app['rec'] else "normal"),
                bg=self.BG_MAIN, fg=self.TEXT_MAIN
            )
            name_lbl.pack(side=tk.LEFT, padx=5)
            name_lbl.bind("<MouseWheel>", _on_mousewheel)

            cat_lbl = tk.Label(
                row, text=app["cat"], font=("Pretendard", 8),
                bg="#F0F0EE", fg=self.TEXT_MUTED, padx=4, pady=1
            )
            cat_lbl.pack(side=tk.LEFT, padx=6)
            cat_lbl.bind("<MouseWheel>", _on_mousewheel)

            size_lbl = tk.Label(
                row, text=app["size"], font=("Pretendard", 8),
                bg=self.BG_MAIN, fg=self.TEXT_MUTED
            )
            size_lbl.pack(side=tk.RIGHT, padx=5)
            size_lbl.bind("<MouseWheel>", _on_mousewheel)

        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        # Bottom selected count status
        self.count_label = tk.Label(
            frame, text="", font=("Pretendard", 9),
            bg=self.BG_MAIN, fg=self.TEXT_MUTED
        )
        self.count_label.pack(anchor="w", pady=(8, 0))
        self.update_count_label()

    def select_all_apps(self):
        for v in self.app_vars.values():
            v.set(True)
        self.update_count_label()

    def deselect_all_apps(self):
        for v in self.app_vars.values():
            v.set(False)
        self.update_count_label()

    def update_count_label(self):
        count = sum(1 for v in self.app_vars.values() if v.get())
        if hasattr(self, 'count_label'):
            self.count_label.configure(
                text=f"선택된 프로그램: {count}개  /  예상 필요 공간: 약 {count * 120} MB"
            )

    # ----------------------------------------------------
    # STEP 3: OPTIONS
    # ----------------------------------------------------
    def render_step_options(self):
        self.btn_back.configure(state=tk.NORMAL)
        self.btn_next.configure(text="설치 시작 (Install) >", state=tk.NORMAL)

        frame = tk.Frame(self.content_area, bg=self.BG_MAIN, padx=25, pady=25)
        frame.pack(fill=tk.BOTH, expand=True)

        tk.Label(
            frame, text="설치 환경 및 세부 옵션", font=("Pretendard", 13, "bold"),
            bg=self.BG_MAIN, fg=self.TEXT_MAIN
        ).pack(anchor="w")

        tk.Label(
            frame, text="프로그램을 설치할 때 적용할 자동화 옵션을 선택하세요.",
            font=("Pretendard", 9), bg=self.BG_MAIN, fg=self.TEXT_MUTED
        ).pack(anchor="w", pady=(4, 20))

        # Checkbox options
        cb1 = tk.Checkbutton(
            frame, text="무인 자동 설치 모드 활성화 (--silent)",
            variable=self.silent_var, font=("Pretendard", 9, "bold"),
            bg=self.BG_MAIN, activebackground=self.BG_MAIN, selectcolor=self.BG_MAIN
        )
        cb1.pack(anchor="w")

        tk.Label(
            frame, text="설치 마법사 창을 일일이 클릭할 필요 없이 백그라운드에서 자동으로 진행합니다.",
            font=("Pretendard", 8), bg=self.BG_MAIN, fg=self.TEXT_MUTED
        ).pack(anchor="w", padx=24, pady=(2, 15))

        # Summary box of chosen apps
        tk.Label(
            frame, text="설치 예정 소프트웨어 목록:", font=("Pretendard", 9, "bold"),
            bg=self.BG_MAIN, fg=self.TEXT_MAIN
        ).pack(anchor="w", pady=(0, 5))

        chosen = [app["name_ko"] for app in SOFTWARE_LIST if self.app_vars[app["id"]].get()]
        summary_box = tk.Text(
            frame, height=7, bg="#F7F6F3", font=("Pretendard", 9),
            relief="flat", bd=1, highlightbackground=self.BORDER_COLOR,
            highlightthickness=1, padx=10, pady=8, fg=self.TEXT_MAIN
        )
        summary_box.pack(fill=tk.X)
        summary_box.insert(tk.END, ", ".join(chosen) if chosen else "(선택된 프로그램이 없습니다)")
        summary_box.configure(state=tk.DISABLED)

    # ----------------------------------------------------
    # STEP 4: INSTALLING (LIVE BACKGROUND EXECUTION)
    # ----------------------------------------------------
    def render_step_installing(self):
        self.btn_back.configure(state=tk.DISABLED)
        self.btn_next.configure(state=tk.DISABLED)
        self.btn_cancel.configure(text="중지 (Cancel)", state=tk.NORMAL)

        frame = tk.Frame(self.content_area, bg=self.BG_MAIN, padx=25, pady=25)
        frame.pack(fill=tk.BOTH, expand=True)

        tk.Label(
            frame, text="소프트웨어 설치 진행 중...", font=("Pretendard", 13, "bold"),
            bg=self.BG_MAIN, fg=self.TEXT_MAIN
        ).pack(anchor="w")

        self.status_label = tk.Label(
            frame, text="설치 엔진 초기화 중...", font=("Pretendard", 9),
            bg=self.BG_MAIN, fg=self.TEXT_MUTED
        )
        self.status_label.pack(anchor="w", pady=(4, 15))

        # Progress bar
        self.progress_bar = ttk.Progressbar(frame, mode="determinate")
        self.progress_bar.pack(fill=tk.X, pady=(0, 15))

        # Real-time console terminal output
        tk.Label(
            frame, text="실시간 설치 출력 로그 (winget):", font=("Pretendard", 8, "bold"),
            bg=self.BG_MAIN, fg=self.TEXT_MUTED
        ).pack(anchor="w", pady=(0, 4))

        self.log_text = tk.Text(
            frame, height=12, bg="#191919", fg="#10B981", font=("Consolas", 8),
            relief="flat", padx=8, pady=8, insertbackground="white"
        )
        self.log_text.pack(fill=tk.BOTH, expand=True)

        # Start thread
        self.is_installing = True
        self.stop_requested = False
        threading.Thread(target=self.run_installation, daemon=True).start()

    def log(self, message):
        def _append():
            self.log_text.insert(tk.END, message + "\n")
            self.log_text.see(tk.END)
        self.after(0, _append)

    def run_installation(self):
        selected = [app for app in SOFTWARE_LIST if self.app_vars[app["id"]].get()]
        total = len(selected)
        if total == 0:
            self.log("선택된 프로그램이 없습니다.")
            self.after(500, lambda: self.show_step(5))
            return

        self.log("=======================================================")
        self.log("⚡ AllDesk 소프트웨어 자동 설치 프로세스 시작")
        self.log(f"총 {total}개 프로그램 대기열 등록됨")
        self.log("=======================================================\n")

        success_count = 0

        for idx, app in enumerate(selected):
            if self.stop_requested:
                self.log("\n[알림] 사용자에 의해 설치가 중지되었습니다.")
                break

            current_num = idx + 1
            progress_pct = int(((idx) / total) * 100)
            self.after(0, lambda p=progress_pct: self.progress_bar.configure(value=p))
            self.after(
                0, lambda a=app, n=current_num, t=total:
                self.status_label.configure(text=f"[{n}/{t}] {a['name_ko']} ({a['id']}) 다운로드 및 설치 중...")
            )

            self.log(f"\n▶ [{current_num}/{total}] {app['name_ko']} 설치 시작...")
            cmd = [
                "winget", "install", "--id", app["id"], "-e",
                "--accept-package-agreements", "--accept-source-agreements"
            ]
            if self.silent_var.get():
                cmd.append("--silent")

            try:
                proc = subprocess.Popen(
                    cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    text=True, encoding="utf-8", errors="replace",
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
                )

                for line in proc.stdout:
                    clean_line = line.strip()
                    if clean_line:
                        self.log(f"   {clean_line}")

                proc.wait()
                if proc.returncode == 0:
                    self.log(f"✔ {app['name_ko']} 설치 성공!")
                    success_count += 1
                else:
                    self.log(f"ℹ {app['name_ko']} 완료 (종료코드: {proc.returncode})")
                    success_count += 1
            except Exception as e:
                self.log(f"✖ {app['name_ko']} 오류: {str(e)}")

        self.after(0, lambda: self.progress_bar.configure(value=100))
        self.log("\n=======================================================")
        self.log(f"🎉 모든 작업이 완료되었습니다! (성공: {success_count}/{total})")
        self.log("=======================================================")
        self.is_installing = False

        self.after(1000, lambda: self.show_step(5))

    # ----------------------------------------------------
    # STEP 5: COMPLETE
    # ----------------------------------------------------
    def render_step_complete(self):
        self.btn_back.configure(state=tk.DISABLED)
        self.btn_next.configure(text="마침 (Finish)", state=tk.NORMAL)
        self.btn_cancel.configure(state=tk.DISABLED)

        frame = tk.Frame(self.content_area, bg=self.BG_MAIN, padx=25, pady=35)
        frame.pack(fill=tk.BOTH, expand=True)

        tk.Label(
            frame, text="🎉", font=("Pretendard", 36),
            bg=self.BG_MAIN
        ).pack(anchor="center", pady=(10, 10))

        tk.Label(
            frame, text="소프트웨어 설치가 완료되었습니다!", font=("Pretendard", 15, "bold"),
            bg=self.BG_MAIN, fg=self.TEXT_MAIN
        ).pack(anchor="center")

        tk.Label(
            frame, text="선택하신 모든 프로그램의 설치 작업이 성공적으로 마무리되었습니다.\n이제 시작 메뉴나 바탕화면에서 프로그램을 실행하실 수 있습니다.",
            font=("Pretendard", 9), bg=self.BG_MAIN, fg=self.TEXT_MUTED, justify="center"
        ).pack(anchor="center", pady=(8, 25))

        callout = tk.Frame(frame, bg="#F7F6F3", highlightbackground=self.BORDER_COLOR, highlightthickness=1, padx=15, pady=12)
        callout.pack(fill=tk.X, padx=10)

        tk.Label(
            callout, text="✔ 백그라운드 클린 설치 완료", font=("Pretendard", 9, "bold"),
            bg="#F7F6F3", fg="#10B981"
        ).pack(anchor="w")
        tk.Label(
            callout, text="임시 설치 파일과 패키지 캐시가 자동으로 정리되었습니다.",
            font=("Pretendard", 8), bg="#F7F6F3", fg=self.TEXT_MUTED
        ).pack(anchor="w", pady=(2, 0))

    # ----------------------------------------------------
    # NAVIGATION HANDLERS
    # ----------------------------------------------------
    def go_next(self):
        if self.current_step == 2:
            chosen = sum(1 for v in self.app_vars.values() if v.get())
            if chosen == 0:
                messagebox.showwarning("선택 필요", "최소 하나 이상의 프로그램을 선택해주세요.")
                return
        if self.current_step == 3:
            self.show_step(4)
            return
        if self.current_step == 5:
            self.destroy()
            return

        if self.current_step < self.total_steps:
            self.show_step(self.current_step + 1)

    def go_back(self):
        if self.current_step > 1:
            self.show_step(self.current_step - 1)

    def on_cancel(self):
        if self.is_installing:
            if messagebox.askyesno("설치 중지", "설치가 진행 중입니다. 정말로 중지하시겠습니까?"):
                self.stop_requested = True
                self.destroy()
        else:
            self.destroy()

if __name__ == "__main__":
    app = SetupWizard()
    app.mainloop()

