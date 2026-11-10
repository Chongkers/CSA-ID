type ProfileCardProps = {
  compact?: boolean;
  name?: string;
  role?: string;
  bio?: string;
  primary?: string;
};

export function ProfileCard({
  compact = false,
  name = "Alex Morgan",
  role = "Product designer",
  bio = "I design useful software and write about the decisions behind it.",
  primary = "#1f6b3a",
}: ProfileCardProps) {
  return (
    <article className={`profileCard ${compact ? "profileCardCompact" : ""}`} style={{ "--profile-accent": primary } as React.CSSProperties}>
      <div className="profileCover" aria-hidden="true"><span /><span /><span /></div>
      <div className="profileBody">
        <div className="avatar" aria-label={`${name} profile image`}>{name.split(" ").map((part) => part[0]).join("")}</div>
        <div className="profileIdentity">
          <p className="profileName">{name}</p>
          <p className="profileRole">{role}</p>
        </div>
        <p className="profileBio">{bio}</p>
        <div className="profileLinks" aria-label="Profile links">
          <span>LinkedIn</span><span>Instagram</span><span>Website</span>
        </div>
        <button className="saveContact" type="button">Save contact</button>
      </div>
    </article>
  );
}
