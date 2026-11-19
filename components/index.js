/**
 * QCV Modular Components Index
 * Exports component manifest for developer workflows.
 */

export const QCV_COMPONENTS = [
  'Navbar',
  'Hero',
  'Metrics',
  'About',
  'Solutions',
  'Process',
  'Technology',
  'PlatformPreview',
  'WhyQCV',
  'CaseStudies',
  'CTA',
  'Footer'
];

export async function loadComponent(name) {
  try {
    const res = await fetch(`/components/${name}.html`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.error(`Failed to load component ${name}:`, err);
    return '';
  }
}
