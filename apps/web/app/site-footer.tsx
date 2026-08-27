// The BuddyBoss theme's copyright text is a customizer setting
// (`buddyboss_theme_options.copyright_text`), not exposed via any REST
// route — hardcoded here rather than adding a custom PHP endpoint just to
// fetch a copyright line. Year is computed, not hardcoded.
export default function SiteFooter() {
  return (
    <footer className="border-t border-black/10 py-8 dark:border-white/10">
      <p className="text-center text-sm text-black/60 dark:text-white/60">
        © {new Date().getFullYear()} – DFY Fresh WordPress Website
      </p>
    </footer>
  );
}
