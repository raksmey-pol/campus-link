import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import dataSource from '../data-source';
import { Course } from '../entities/course.entity';

loadEnv();

type SeedCourse = {
  code: string;
  title: string;
  credits: number;
  department: string;
  prerequisites?: string;
  description?: string;
};

const seedCourses: SeedCourse[] = [
  // === ICT / Computer Science ===
  {
    code: 'CS101',
    title: 'Introduction to Programming',
    credits: 3,
    department: 'ICT',
    description: 'Basics of programming using a high-level language.',
  },
  {
    code: 'CS102',
    title: 'Data Structures',
    credits: 3,
    department: 'ICT',
    prerequisites: 'CS101',
  },
  {
    code: 'CS201',
    title: 'Algorithms',
    credits: 3,
    department: 'ICT',
    prerequisites: 'CS102',
  },
  {
    code: 'CS202',
    title: 'Database Systems',
    credits: 3,
    department: 'ICT',
  },
  {
    code: 'CS203',
    title: 'Operating Systems',
    credits: 3,
    department: 'ICT',
  },
  {
    code: 'CS204',
    title: 'Computer Networks',
    credits: 3,
    department: 'ICT',
  },
  {
    code: 'CS205',
    title: 'Software Engineering',
    credits: 3,
    department: 'ICT',
  },
  {
    code: 'CS206',
    title: 'Web Development',
    credits: 3,
    department: 'ICT',
  },
  {
    code: 'CS207',
    title: 'Mobile App Development',
    credits: 3,
    department: 'ICT',
  },
  {
    code: 'CS208',
    title: 'Artificial Intelligence',
    credits: 3,
    department: 'ICT',
    prerequisites: 'CS201',
  },

  // === Math ===
  {
    code: 'MATH101',
    title: 'Calculus I',
    credits: 3,
    department: 'Mathematics',
  },
  {
    code: 'MATH102',
    title: 'Calculus II',
    credits: 3,
    department: 'Mathematics',
    prerequisites: 'MATH101',
  },
  {
    code: 'MATH201',
    title: 'Linear Algebra',
    credits: 3,
    department: 'Mathematics',
  },
  {
    code: 'MATH202',
    title: 'Discrete Mathematics',
    credits: 3,
    department: 'Mathematics',
  },

  // === Business ===
  {
    code: 'BUS101',
    title: 'Introduction to Business',
    credits: 3,
    department: 'Business',
  },
  {
    code: 'BUS102',
    title: 'Principles of Marketing',
    credits: 3,
    department: 'Business',
  },
  {
    code: 'BUS201',
    title: 'Financial Accounting',
    credits: 3,
    department: 'Business',
  },
  {
    code: 'BUS202',
    title: 'Management Principles',
    credits: 3,
    department: 'Business',
  },

  // === Design / Multimedia ===
  {
    code: 'DES101',
    title: 'Introduction to Graphic Design',
    credits: 3,
    department: 'Design',
  },
  {
    code: 'DES102',
    title: 'UI/UX Design',
    credits: 3,
    department: 'Design',
  },
  {
    code: 'DES201',
    title: 'Digital Media Production',
    credits: 3,
    department: 'Design',
  },

  // === General Education ===
  {
    code: 'ENG101',
    title: 'English Composition',
    credits: 3,
    department: 'General',
  },
  {
    code: 'ENG102',
    title: 'Public Speaking',
    credits: 3,
    department: 'General',
  },
  {
    code: 'SOC101',
    title: 'Introduction to Sociology',
    credits: 3,
    department: 'General',
  },
  {
    code: 'PSY101',
    title: 'Introduction to Psychology',
    credits: 3,
    department: 'General',
  },

  // === Advanced ICT ===
  {
    code: 'CS301',
    title: 'Cloud Computing',
    credits: 3,
    department: 'ICT',
  },
  {
    code: 'CS302',
    title: 'Cybersecurity Fundamentals',
    credits: 3,
    department: 'ICT',
  },
  {
    code: 'CS303',
    title: 'DevOps Engineering',
    credits: 3,
    department: 'ICT',
  },
  {
    code: 'CS304',
    title: 'Machine Learning',
    credits: 3,
    department: 'ICT',
    prerequisites: 'CS208',
  },
  {
    code: 'CS305',
    title: 'Big Data Analytics',
    credits: 3,
    department: 'ICT',
  },
];

async function seedCoursesData(): Promise<void> {
  await dataSource.initialize();
  const courseRepo = dataSource.getRepository(Course);

  let created = 0;
  let updated = 0;

  for (const seed of seedCourses) {
    const existing = await courseRepo.findOne({
      where: { code: seed.code },
    });

    if (existing) {
      existing.title = seed.title;
      existing.credits = seed.credits;
      existing.department = seed.department;
      existing.prerequisites = seed.prerequisites ?? null;
      existing.description = seed.description ?? null;

      await courseRepo.save(existing);
      updated++;
      console.log(`[seed-courses] Updated: ${seed.code}`);
      continue;
    }

    const course = courseRepo.create({
      code: seed.code,
      title: seed.title,
      credits: seed.credits,
      department: seed.department,
      prerequisites: seed.prerequisites ?? null,
      description: seed.description ?? null,
    });

    await courseRepo.save(course);
    created++;
    console.log(`[seed-courses] Created: ${seed.code}`);
  }

  console.log(`[seed-courses] Done. Created: ${created}, Updated: ${updated}`);
}

void seedCoursesData()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(`[seed-courses] Failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });
