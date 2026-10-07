import { createUserSchema } from '@espacofit/shared'

export function birthDateInfo(value: string, today = new Date()) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const day = Number(match[1]), month = Number(match[2]), year = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (year < 1900 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date > today) return null
  const age = today.getFullYear() - year - (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day) ? 1 : 0)
  return { iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, age }
}

export function maskDate(value: string) {
  return value.replace(/\D/g, '').slice(0, 8).replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2')
}

export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  const prefix = `(${digits.slice(0, 2)}) `
  const number = digits.slice(2)
  if (number.length <= 1) return prefix + number
  if (number.length <= 5) return prefix + number[0] + ' ' + number.slice(1)
  return prefix + number[0] + ' ' + number.slice(1, 5) + ' - ' + number.slice(5)
}

export function maskCpf(value: string) {
  return value.replace(/\D/g, '').slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3}\.\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, '$1-$2')
}

const registrationSchema = createUserSchema.extend({
  name: createUserSchema.shape.name.refine((name) => (name.match(/\p{L}/gu) || []).length >= 2, 'O nome precisa ter no mínimo 2 letras.'),
  anamnesis: createUserSchema.shape.anamnesis.unwrap().extend({
    cpf: createUserSchema.shape.anamnesis.unwrap().shape.cpf.refine((cpf) => cpf.length === 11, 'Informe o CPF com 11 números'),
    daysPerWeek: createUserSchema.shape.anamnesis.unwrap().shape.daysPerWeek.refine((days) => days !== null, 'Informe os dias por semana (1 a 7)'),
  }),
})

export function studentPayload(values: Record<string, string>) {
  const birth = birthDateInfo(values.birthDate || '')
  return registrationSchema.safeParse({
    name: values.name, email: values.email?.trim(), role: 'ALUNO',
    anamnesis: {
      ...values,
      birthDate: birth?.iso || '',
      cpf: values.cpf?.replace(/\D/g, ''),
      daysPerWeek: values.daysPerWeek ? Number(values.daysPerWeek) : null,
      minutesPerSession: values.minutesPerSession ? Number(values.minutesPerSession) : null,
    },
  })
}
