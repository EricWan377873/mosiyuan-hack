// ==UserScript==
// @name         膜拜 Siyuan - 时间加速器
// @namespace    https://lmoliver.github.io/mosiyuan/
// @version      1.0.0
// @description  左右按钮调节游戏时间：<<0=1倍、<<1=2倍、<<2=4倍……
// @match        https://lmoliver.github.io/mosiyuan/
// @match        https://lmoliver.github.io/mosiyuan/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    if (window.__mosiyuanTimeShiftInstalled) return;
    window.__mosiyuanTimeShiftInstalled = true;

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

    const style = document.createElement('style');
    style.textContent = `
        #msy-time-shift {
            position: fixed;
            right: 16px;
            bottom: 16px;
            z-index: 2147483647;
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
})();
