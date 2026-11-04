import { t } from "../i18n.js";

export function badge(it) {
  return it.conf === "R" ? '<span class="tag">' + t("src.single") + "</span>" : "";
}
