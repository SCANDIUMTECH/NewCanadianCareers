export default function HomePage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>GDPR Module Demo</h1>
      <p>
        This is a demo page for the GDPR compliance module. The cookie consent
        banner should appear at the bottom of the page.
      </p>
      <ul>
        <li>
          <a href="/privacy-center">Privacy Center</a>
        </li>
        <li>
          <a href="/privacy-center/forget-me">Right to Erasure</a>
        </li>
        <li>
          <a href="/privacy-center/request-data">Data Access Request</a>
        </li>
        <li>
          <a href="/privacy-center/contact-dpo">Contact DPO</a>
        </li>
        <li>
          <a href="/privacy-center/data-rectification">Data Rectification</a>
        </li>
      </ul>
    </main>
  );
}
