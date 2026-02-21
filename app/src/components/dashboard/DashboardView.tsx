import { BackupSection } from './BackupSection'
import { TestConfigSection } from './TestConfigSection'
import { StudentInputSection } from './StudentInputSection'
import type { AppSettings, Objective, Student, StudentGrid } from '../../types'

interface DashboardViewProps {
   students: Student[]
   objectives: Objective[]
   grids: StudentGrid[]
   settings: AppSettings
   onUpdateSettings: (next: AppSettings) => void
   onApplyTemplate: (objectives: Objective[]) => Promise<void>
   onCreateStudents: (students: { lastname: string; firstname: string }[]) => Promise<void>
   testType: 'formatif' | 'sommatif'
}

export const DashboardView = ({
   students,
   objectives,
   grids,
   settings,
   onUpdateSettings,
   onApplyTemplate,
   onCreateStudents,
   testType,
}: DashboardViewProps) => {
   return (
      <section className="space-y-6">
         <BackupSection />
         <TestConfigSection
            settings={settings}
            objectives={objectives}
            onUpdateSettings={onUpdateSettings}
            onApplyTemplate={onApplyTemplate}
         />
         <StudentInputSection
            students={students}
            grids={grids}
            testType={testType}
            onCreateStudents={onCreateStudents}
         />
      </section>
   )
}