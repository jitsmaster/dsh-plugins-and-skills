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
		* A compact control in the sidebar foot that lets you:
		*  - Toggle the workspaces (left) area: calls the frame's `layout.toggleSidebar()`
		*    so the workspaces/session list expands to fill the left panel (or collapses
		*    to the rail) — enough room to see the workspaces listing on mobile.
		*  - Resize the Files (Explorer) width via -/+ (writes the
		*    `chat-workspace-width-px` preference; the aionui-panel re-reads it on its
		*    next init/reload).
		*/
		const name = "dsh-panel-controls";
		const inject = ["slots"];
		const KEY_EXPLORER_WIDTH = "chat-workspace-width-px";
		const MIN_W = 220;
		const MAX_W = 500;
		const STEP_W = 40;
		const DEFAULT_W = 260;
		function apply(ctx) {
			ctx.inject(["slots"], (scope) => {
				const layout = scope.get("layout");
				scope.slots.inject("sidebar.footer.action", () => scope.slots.register({
					name: "sidebar.footer.action",
					id: "panel-controls",
					order: 90,
					label: "Workspaces"
				}, (props) => react.default.createElement(PanelControls, {
					layout,
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
			const layout = props.layout;
			const [width, setWidth] = react.default.useState(readWidth);
			const toggleSidebar = () => {
				if (layout !== void 0 && typeof layout.toggleSidebar === "function") layout.toggleSidebar();
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
			} }, button("⇤⇥", toggleSidebar, "Toggle the workspaces (left) area — expand it to fill the left panel (mobile-friendly) or collapse to the rail", false), button("−", () => nudge(-40), "Shrink Files panel width", false), react.default.createElement("span", { style: {
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