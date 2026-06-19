import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <p className="site-footer-credit">
          Built with <span aria-hidden="true">♥</span> by Hitesh Kumar
        </p>
        <div className="site-footer-links">
          <a href="https://github.com/hiteshkumarTech" target="_blank" rel="noreferrer">GitHub</a>
          <span className="site-footer-divider" aria-hidden="true">|</span>
          <a href="https://www.linkedin.com/in/hitesh-kumar-0b7702416" target="_blank" rel="noreferrer">LinkedIn</a>
          <span className="site-footer-divider" aria-hidden="true">|</span>
          <a href="https://instagram.com/hitesh_1w" target="_blank" rel="noreferrer">Instagram</a>
        </div>
      </div>
    </footer>
  );
}
