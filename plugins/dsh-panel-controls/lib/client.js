window.__ModuleLoader__.load({
	id: "dsh-panel-controls",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		//#region ../../../../../dsh-system-work/dsh-plugins-and-skills/plugins/dsh-panel-controls/src/client/index.ts
		/**
		* dsh-panel-controls — browser half.
		*
		* A compact control in the sidebar foot ("beside Settings") that lets you:
		*  - Toggle "Focus workspaces": flips the dsh-aionui-panel `enabled` setting
		*    live — hides the whole Files/Preview/SCM panel group so the workspaces /
		*    chat column grows, and toggles back.
		*  - Resize the Files (Explorer) width via -/+ (writes the
		*    `chat-workspace-width-px` preference; the aionui-panel re-reads it on its
		*    next init/reload).
		*
		* The aionui-panel itself keeps the width in a private store, so in-page live
		* resize of the Files panel is only via its own drag handle / collapse chevron.
		*/
		const name = "dsh-panel-controls";
		const inject = ["slots"];
		const PANEL_NS = "aionui-panel";
		const KEY_EXPLORER_WIDTH = "chat-workspace-width-px";
		const MIN_W = 220;
		const MAX_W = 500;
		const STEP_W = 40;
		const DEFAULT_W = 260;
		function apply(ctx) {
			ctx.inject(["slots"], (scope) => {
				const binder = scope.get("webUiSettings") ?? scope.get("settingsScope");
				scope.slots.inject("sidebar.footer.action", () => scope.slots.register({
					name: "sidebar.footer.action",
					id: "panel-controls",
					order: 90,
					label: "Workspaces focus"
				}, (props) => react.default.createElement(PanelControls, {
					binder,
					wide: props.wide
				})));
			});
		}
		function readWidth() {
			let raw = 0;
			try {
				raw = Number(localStorage.getItem(KEY_EXPLORER_WIDTH));
			} catch {}
			if (!Number.isFinite(raw)) return DEFAULT_W;
			return Math.max(MIN_W, Math.min(MAX_W, raw));
		}
		function writeWidth(value) {
			const clamped = Math.max(MIN_W, Math.min(MAX_W, value));
			try {
				localStorage.setItem(KEY_EXPLORER_WIDTH, String(Math.round(clamped)));
			} catch {}
			return clamped;
		}
		function PanelControls(props) {
			const binder = props.binder;
			const [width, setWidth] = react.default.useState(readWidth);
			const [focus, setFocus] = react.default.useState(false);
			const setEnabled = (enabled) => {
				if (binder === void 0) return;
				try {
					const bound = typeof binder.bind === "function" ? binder.bind({ namespace: PANEL_NS }) : binder;
					if (bound !== void 0 && typeof bound.set === "function") bound.set("enabled", enabled);
				} catch {}
			};
			const toggleFocus = () => {
				const next = !focus;
				setFocus(next);
				setEnabled(!next);
			};
			const nudge = (delta) => setWidth(writeWidth(readWidth() + delta));
			const button = (label, onClick, title, active) => react.default.createElement("button", {
				onClick,
				title,
				style: {
					cursor: "pointer",
					padding: "2px 6px",
					fontWeight: active ? 700 : 400
				}
			}, label);
			return react.default.createElement("div", { style: {
				display: "flex",
				gap: "4px",
				alignItems: "center",
				fontSize: "12px"
			} }, button(focus ? "◱" : "◻", toggleFocus, "Focus workspaces — hide the Files/Preview/SCM panels so the workspaces/chat grow (toggle back)", focus), button("−", () => nudge(-40), "Shrink Files panel width", false), react.default.createElement("span", { style: {
				minWidth: "26px",
				textAlign: "center"
			} }, String(width)), button("+", () => nudge(STEP_W), "Grow Files panel width", false));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map