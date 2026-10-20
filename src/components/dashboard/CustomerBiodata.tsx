
'use client';

import type { Profile } from '@/types/matchmaking';

interface CustomerBiodataProps {
  client: Profile;
}

export default function CustomerBiodata({
  client,
}: CustomerBiodataProps) {
  const fields = [
    ['First & Last Name', `${client.firstName} ${client.lastName}`],
    ['Gender', client.gender],
    ['Date of Birth (Age)', `${client.dob} (${client.age} yrs)`],
    ['Country & City', `${client.city}, ${client.country}`],
    ['Height', client.heightDisplay],
    ['Marital Status', client.maritalStatus],
    ['Email Address', client.email],
    ['Phone Number', client.phone],
    ['Undergraduate College', client.undergradCollege],
    ['Degree', client.degree],
    ['Annual Income', client.incomeDisplay],
    ['Company & Designation', `${client.designation}, ${client.company}`],
    ['Religion & Caste', `${client.religion} (${client.caste})`],
    ['Languages Known', client.languages.join(', ')],
    ['Siblings', client.siblings],
    ['Want Kids', client.wantKids],
    ['Open to Relocate', client.openToRelocate],
    ['Open to Pets', client.openToPets],
    ['Dietary Preference (Indian Context)', client.diet],
    ['Family Structure', client.familyType],
    [
      'Work Mode & Lifestyle',
      `${client.workMode} • ${client.drinkingSmoking} Drink/Smoke`,
    ],
  ] as const;

  return (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
      <h3 className="text-base font-bold text-stone-900 mb-4 pb-2 border-b border-stone-100">
        Complete Verified Customer Biodata
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
        {fields.map(([label, value]) => (
          <div key={label}>
            <span className="text-stone-400 block">{label}</span>
            <span className="font-semibold text-stone-800">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
