import { readFileSync } from 'node:fs'
import path from 'node:path'

const SKILLS_PATH = path.join(process.cwd(), 'features/docs/generated/ai-skills.json')

interface SkillSummary {
  name: string
  description: string
  installCommand: string
}

export const AiSkillsIndex = (): string => {
  const skills: SkillSummary[] = JSON.parse(readFileSync(SKILLS_PATH, 'utf-8'))

  return skills
    .map(
      (skill) =>
        `### ${skill.name}\n\n${skill.description}\n\n\`\`\`sh\n${skill.installCommand}\n\`\`\``
    )
    .join('\n\n')
}
