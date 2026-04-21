import { permanentRedirect } from "next/navigation";

// R29-MERGE: pagina unificata in /admin/calendario (calendario + form
// blocca/rilascia nello stesso posto). Redirect 308 mantiene vecchi
// bookmark funzionanti.
export default function Page() {
  permanentRedirect("/admin/calendario");
}
