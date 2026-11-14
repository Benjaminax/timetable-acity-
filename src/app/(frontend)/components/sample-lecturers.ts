import type { Lecturer } from './scheduler-types'

const namedLecturers: Lecturer[] = [
  {
    id: 'EMP-014',
    name: 'Dr. K. Mensah',
    email: 'emp014@acity.edu.gh',
    department: 'Computational Sciences',
    office: 'Tech 2.14',
    weeklyLimit: 12,
  },
  {
    id: 'EMP-022',
    name: 'Dr. E. Adu',
    email: 'emp022@acity.edu.gh',
    department: 'Electrical, Electronics & Computer Engineering',
    office: 'Eng 1.08',
    weeklyLimit: 14,
  },
  {
    id: 'EMP-031',
    name: 'Prof. J. Owusu',
    email: 'emp031@acity.edu.gh',
    department: 'Mathematics & General Studies',
    office: 'Main 3.02',
    weeklyLimit: 12,
  },
  {
    id: 'EMP-047',
    name: 'Ama Boateng',
    email: 'emp047@acity.edu.gh',
    department: 'Computational Sciences',
    office: 'Tech 1.12',
    weeklyLimit: 10,
  },
  {
    id: 'EMP-058',
    name: 'Dr. S. Osei',
    email: 'emp058@acity.edu.gh',
    department: 'Biomedical Engineering',
    office: 'Science 2.06',
    weeklyLimit: 10,
  },
]

const sampleDepartments = [
  'Business Administration & Entrepreneurship',
  'Communication Arts',
  'Computational Sciences',
  'Informatics',
  'Biomedical Engineering',
  'Electrical, Electronics & Computer Engineering',
  'Mechanical, Industrial & Systems Engineering',
]

const generatedLecturers: Lecturer[] = Array.from({ length: 45 }, (_, index) => {
  const employeeNumber = index + 59
  const rosterNumber = index + 6
  const formattedRosterNumber = String(rosterNumber).padStart(3, '0')
  const formattedEmployeeNumber = String(employeeNumber).padStart(3, '0')
  return {
    id: `EMP-${formattedEmployeeNumber}`,
    name: `Sample Lecturer ${formattedRosterNumber}`,
    email: `emp${formattedEmployeeNumber}@acity.edu.gh`,
    department: sampleDepartments[index % sampleDepartments.length],
    office: `Faculty Office ${formattedRosterNumber}`,
    weeklyLimit: 10 + (index % 5),
  }
})

const workshopLecturer: Lecturer = {
  id: 'EMP-104',
  name: 'Anna Tetteh',
  email: 'emp104@acity.edu.gh',
  department: 'Career Services',
  office: 'Student Services',
  weeklyLimit: 10,
}

export const initialLecturers: Lecturer[] = [...namedLecturers, ...generatedLecturers, workshopLecturer]
