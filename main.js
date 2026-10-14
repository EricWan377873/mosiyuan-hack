
// ==UserScript==
// @name         膜拜 Siyuan - 时间加速器
// @namespace    https://lmoliver.github.io/mosiyuan/
// @version      1.1.0
// @description  保留最高2^512倍时间加速，增加左下角双击确认清空游戏存档的急救按钮
// @match        https://lmoliver.github.io/mosiyuan/
// @match        https://lmoliver.github.io/mosiyuan/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    if (window.__mosiyuanTimeShiftInstalled) return;
    window.__mosiyuanTimeShiftInstalled = true;


    // 先设置急救逻辑，绝不依赖 Vue 或游戏计算是否成功。
    // 原游戏源码确定使用 localStorage['game-mosiyuan-save'] 自动保存，
    // 加速器使用 localStorage['mosiyuan_time_shift'] 保存倍率。
    const GAME_SAVE_KEY = 'game-mosiyuan-save';
    const RESET_PENDING_KEY = '__msy_emergency_reset_pending__';

    function removeSavedProgress() {
        // 只删与本游戏有关的两项，避免误删同源下其他 GitHub Pages 页面存档。
        localStorage.removeItem(GAME_SAVE_KEY);
        localStorage.removeItem('mosiyuan_time_shift');
        try {
            sessionStorage.removeItem(GAME_SAVE_KEY);
            sessionStorage.removeItem('mosiyuan_time_shift');
        } catch (_) {}
    }

    // 二次清理：本页游戏每 20ms 自动存档，可能在跳转前重写旧值。
    // 因此刷新后的 document-start 阶段再删除一次，抢在游戏读档之前。
    try {
        if (sessionStorage.getItem(RESET_PENDING_KEY) === '1') {
            removeSavedProgress();
            sessionStorage.removeItem(RESET_PENDING_KEY);
        }
    } catch (error) {
        console.warn('[膜拜 Siyuan 急救] 重新载入时清理存档失败：', error);
    }

    function resetGame() {
        if (!window.confirm(
            '确定清空《膜拜 Siyuan》的浏览器本地存档并刷新页面吗？\n' +
            '这会永久删除游戏进度及时间加速倍率，无法撤销。\n' +
            '不会删除该域名下其他游戏的存档。'
        )) return;

        // 使用 sessionStorage 留下仅在本标签页有效的重置标记。
        // 点击确认时清理一次，下一次页面初始化时再清理一次。
        try {
            sessionStorage.setItem(RESET_PENDING_KEY, '1');
        } catch (_) {
            // 浏览器禁止 sessionStorage 时仍会尝试直接清理和刷新。
        }
        try {
            removeSavedProgress();
        } catch (error) {
            try { sessionStorage.removeItem(RESET_PENDING_KEY); } catch (_) {}
            window.alert('清除存档失败，未刷新页面。请检查浏览器的站点存储权限。\n' + error);
            return;
        }

        // 部分浏览器的离开页面过程可能允许旧存档被再次写入。
        // 页面离开时再清理一次，下一页还会根据标记进行最终清理。
        window.addEventListener('pagehide', () => {
            try { removeSavedProgress(); } catch (_) {}
        }, { once: true });
        window.location.reload();
    }

    function mountEmergencyButton() {
        if (!document.body) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'msy-emergency-reset';
        button.textContent = '清空本网址对应的浏览器缓存（双击）';
        button.title = '双击后会弹出浏览器确认框；确认将永久删除本游戏存档和倍率';
        button.setAttribute('aria-label', '清空本网址对应的浏览器缓存（双击）');
        // 不依赖外部 CSS、Vue、#global 等 DOM；在背景黑屏时也能显示。
        button.style.cssText = [
            'all: initial !important',
            'position: fixed !important',
            'left: 16px !important',
            'bottom: 16px !important',
            'z-index: 2147483647 !important',
            'display: block !important',
            'visibility: visible !important',
            'opacity: 1 !important',
            'pointer-events: auto !important',
            'max-width: calc(100vw - 32px) !important',
            'box-sizing: border-box !important',
            'padding: 10px 12px !important',
            'background: #dc2626 !important',
            'color: #fff !important',
            'border: 2px solid #fecaca !important',
            'border-radius: 9px !important',
            'box-shadow: 0 6px 24px #0009 !important',
            'font: 600 13px/1.4 system-ui, sans-serif !important',
            'text-align: center !important',
            'white-space: normal !important',
            'cursor: pointer !important',
            'touch-action: manipulation !important',
        ].join(';');
        button.addEventListener('dblclick', resetGame);
        document.body.appendChild(button);

        // 即使游戏意外重新生成了 body 的直接子节点，也尽量重新挂回按钮。
        const observer = new MutationObserver(() => {
            if (document.body && button.parentNode !== document.body) {
                document.body.appendChild(button);
            }
        });
        observer.observe(document.body, { childList: true });
    }

    function onBodyReady(callback) {
        if (document.body) return callback();
        const observer = new MutationObserver(() => {
            if (document.body) {
                observer.disconnect();
                callback();
            }
        });
        observer.observe(document, { childList: true, subtree: true });
    }
    const MAX_SHIFT = 512; // 再多，大概 900，就会立即出现 inf，然后是 nan，然后游戏爆炸
    const SAVE_KEY = 'mosiyuan_time_shift';
    let shift = 0;
    let attached = false;

    try {
        const saved = Number(localStorage.getItem(SAVE_KEY));
        if (Number.isFinite(saved)) {
            shift = Math.max(0, Math.min(MAX_SHIFT, Math.trunc(saved)));
        }
    } catch (_) {}
    function mountTimeShift() {
    const style = document.createElement('style');
    style.textContent = `
        #msy-time-shift {
            position: fixed;
            right: 16px;
            bottom: 16px;
            z-index: 2147483646;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            color: #f8fafc;
            background: rgba(16, 24, 40, 0.93);
            border: 1px solid #64748b;
            border-radius: 12px;
            box-shadow: 0 6px 24px #0005;
            font: 14px/1.4 system-ui, sans-serif;
        }
        #msy-time-shift button {
            min-width: 36px;
            min-height: 34px;
            border: 1px solid #64748b;
            border-radius: 8px;
            background: #334155;
            color: white;
            cursor: pointer;
            font: inherit;
        }
        #msy-time-shift button:hover:not(:disabled) {
            background: #475569;
        }
        #msy-time-shift button:disabled {
            opacity: .4;
            cursor: not-allowed;
        }
        #msy-time-shift .msy-value {
            min-width: 94px;
            text-align: center;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
        }
        #msy-time-shift .msy-status {
            display: block;
            font-size: 11px;
            color: #cbd5e1;
            font-weight: 400;
        }
        @media (max-width: 760px) {
            #msy-time-shift { bottom: 72px; }
        }
    `;
    document.head.appendChild(style);
    const panel = document.createElement('div');
    panel.id = 'msy-time-shift';
    panel.innerHTML = `
        <button type="button" id="msy-slower" title="时间左移次数 -1">◀</button>
        <div class="msy-value">
            <div id="msy-shift-label">&lt;&lt;0</div>
            <span id="msy-speed-label" class="msy-status">1×</span>
            <span id="msy-attach-status" class="msy-status">连接游戏中…</span>
        </div>
        <button type="button" id="msy-faster" title="时间左移次数 +1">▶</button>
    `;
    document.body.appendChild(panel);
    const slower = panel.querySelector('#msy-slower');
    const faster = panel.querySelector('#msy-faster');
    const shiftLabel = panel.querySelector('#msy-shift-label');
    const speedLabel = panel.querySelector('#msy-speed-label');
    const statusLabel = panel.querySelector('#msy-attach-status');
    function render() {
        shiftLabel.textContent = `<<${shift}`;
        speedLabel.textContent = `${2 ** shift}×`;
        statusLabel.textContent = attached ? '已加速游戏时间' : '连接游戏中…';
        slower.disabled = !attached || shift === 0;
        faster.disabled = !attached || shift === MAX_SHIFT;
    }
    function changeShift(delta) {
        if (!attached) return;
        shift = Math.max(0, Math.min(MAX_SHIFT, shift + delta));
        try {
            localStorage.setItem(SAVE_KEY, String(shift));
        } catch (_) {}
        render();
    }

    slower.addEventListener('click', () => changeShift(-1));
    faster.addEventListener('click', () => changeShift(+1));
    render();
    // 原游戏使用 Vue 2；避免访问 window._（游戏会将其视作调试行为）。
    function findGame() {
        for (const el of document.body.children) {
            const vm = el.__vue__;
            if (vm &&
                typeof vm.gameTick === 'function' &&
                typeof vm.processAchs === 'function' &&
                typeof vm.lastTime === 'number') {
                return vm;
            }
        }
        return null;
    }
    function attach() {
        if (attached) return;
        const game = findGame();
        if (!game) return;

        // 游戏主循环执行 this.gameTick(s)，其中 s 为真实经过的秒数。
        // 放大此处的时间，不改 Date.now()、世界速度或存档数据。
        const originalTick = game.gameTick;
        game.gameTick = function (seconds) {
            return originalTick.call(game, seconds * (2 ** shift));
        };
        attached = true;
        clearInterval(poll);
        render();
    }
    const poll = setInterval(attach, 250);
    attach();
    }

    // 急救按钮先挂载，游戏时间加速面板之后初始化。
    // 即使 Vue 无法启动/游戏显示纯黑，急救按钮也不受影响。
    onBodyReady(() => {
        mountEmergencyButton();
        mountTimeShift();
    });
})();
