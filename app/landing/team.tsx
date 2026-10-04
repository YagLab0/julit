import Image from "next/image";
import { randomInt } from "node:crypto";
import { connection } from "next/server";
import styles from "./team.module.css";

type TeamMember = {
  firstName: string;
  lastName: string;
  email: string;
  linkedin: string;
  avatar: string;
};

const TEAM_MEMBERS: TeamMember[] = [
  {
    firstName: "Mauricio",
    lastName: "Rios",
    email: "riosmaurii@gmail.com",
    linkedin: "https://www.linkedin.com/in/rios-mauricio",
    avatar: "/team/mauricio-rios.jpg",
  },
  {
    firstName: "Samuel",
    lastName: "Paredes",
    email: "samueleliasparedes.10@gmail.com",
    linkedin: "https://www.linkedin.com/in/samas-dev/",
    avatar: "/team/samuel-paredes.jpg",
  },
  {
    firstName: "Mayko",
    lastName: "Fernandez",
    email: "maykox34f@gmail.com",
    linkedin: "https://www.linkedin.com/in/Mayko2003",
    avatar: "/team/mayko.jpg",
  },
  {
    firstName: "Mauro Benjamin",
    lastName: "Mamani",
    email: "mauromamani.b@gmail.com",
    linkedin: "https://www.linkedin.com/in/mauromamani/",
    avatar: "/team/mauro-mamani.jpg",
  },
];

function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m4 7 8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 10.5V17m0-6.5v-.01M12 17v-3.8c0-1.2.9-2.2 2-2.2s2 .9 2 2.2V17m-4-6.5v-.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export async function TeamSection() {
  await connection();
  const members = [...TEAM_MEMBERS];
  for (let index = members.length - 1; index > 0; index--) {
    const target = randomInt(index + 1);
    [members[index], members[target]] = [members[target], members[index]];
  }
  return (
    <section
      id="equipo"
      aria-labelledby="team-heading"
      className={`bg-background text-foreground ${styles.team}`}
    >
      <div className={styles.container}>
        <div className={styles.intro} data-landing-reveal>
          <div>
            <p className="eyebrow">Las personas detrás del proyecto</p>
            <h2 id="team-heading" className={styles.heading}>
              Nuestro equipo.
            </h2>
          </div>
          <div className={styles.lead}>
            <p className={styles.description}>
              Desde Jujuy, construimos JuLit para la hackathon de Superteam /
              Solana.
            </p>
          </div>
        </div>

        <ul className={styles.grid} aria-label="Integrantes del equipo">
          {members.map((member) => {
            const fullName = `${member.firstName} ${member.lastName}`;
            return (
              <li key={member.email} className={styles.card}>
                <Image
                  src={member.avatar}
                  alt={`Foto de ${fullName}`}
                  width={80}
                  height={80}
                  className={styles.avatar}
                />
                <p className={styles.memberLabel}>Equipo JuLit</p>
                <h3 className={styles.name}>{fullName}</h3>
                <div className={styles.links}>
                  <a
                    href={`mailto:${member.email}`}
                    className={styles.link}
                    aria-label={`Enviar correo a ${fullName}`}
                  >
                    <MailIcon />
                    Correo
                  </a>
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                    aria-label={`Perfil de LinkedIn de ${fullName}`}
                  >
                    <LinkedinIcon />
                    LinkedIn
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
