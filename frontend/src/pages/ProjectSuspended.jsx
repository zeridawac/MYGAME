const ProjectSuspended = () => {
  return (
    <main className="suspension-page" dir="ltr" aria-label="Project suspended notice">
      <div className="suspension-loader" aria-hidden="true" />

      <div className="suspension-background" aria-hidden="true">
        <span className="suspension-glow suspension-glow-one" />
        <span className="suspension-glow suspension-glow-two" />
        <span className="suspension-orbit suspension-orbit-one" />
        <span className="suspension-orbit suspension-orbit-two" />
      </div>

      <section className="suspension-content">
        <p className="suspension-kicker">Project Suspended</p>
        <h1>The project is currently on hold until further notice.</h1>
        <p className="suspension-subtitle">Thank you for your support and understanding.</p>

        <div className="suspension-image-shell" aria-label="Reserved image section">
          <div className="suspension-image-placeholder">
            <span>Image placeholder</span>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ProjectSuspended;
