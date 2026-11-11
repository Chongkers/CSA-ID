type ProfileCardProps = {
  compact?: boolean;
  name?: string;
  role?: string;
  bio?: string;
  primary?: string;
  avatarUrl?: string;
  coverUrl?: string;
};

export function ProfileCard({
  compact = false,
  name = "Alex Santos",
  role = "Student assistant",
  bio = "Peer adviser for tutoring sessions at the Center for Student Advising.",
  primary = "#b5121b",
  avatarUrl,
  coverUrl,
}: ProfileCardProps) {
  return (
    <article className={`profileCard ${compact ? "profileCardCompact" : ""}`} style={{ "--profile-accent": primary } as React.CSSProperties}>
      <div className="profileCover" aria-hidden="true" style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>{!coverUrl && <><span /><span /><span /></>}</div>
      <div className="profileBody">
        <div className="avatar" aria-label={`${name} profile image`} style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>{avatarUrl ? "" : name.split(" ").map((part) => part[0]).join("")}</div>
        <div className="profileIdentity">
          <p className="profileName">{name}</p>
          <p className="profileRole">{role}</p>
        </div>
        <p className="profileBio">{bio}</p>
        <div className="profileLinks" aria-label="Profile links">
          <span>LinkedIn</span><span>Facebook</span><span>Instagram</span>
        </div>
        <button className="saveContact" type="button">Open evaluation form</button>
      </div>
    </article>
  );
}
