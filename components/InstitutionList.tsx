// components/InstitutionList.tsx

"use client";

import { useEffect, useState } from "react";

interface Institution {
  id: number;
  institution_name: string;
  email: string;
  website: string;
  created_at: string;
}

export default function InstitutionList() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const res = await fetch("/api/institutions"); // ← đường dẫn tương ứng với file API bạn tạo
        const data = await res.json();
        setInstitutions(data.institutions || []);
      } catch (error) {
        console.error("Failed to fetch institutions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInstitutions();
  }, []);

  if (loading) return <p>Loading institutions...</p>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Registered Institutions</h2>
      <ul className="space-y-3">
        {institutions.map((inst) => (
          <li key={inst.id} className="p-3 border rounded shadow-sm bg-white">
            <p>
              <strong>{inst.institution_name}</strong>
            </p>
            <p>Email: {inst.email}</p>
            <p>
              Website:{" "}
              <a
                href={inst.website}
                target="_blank"
                className="text-blue-600 underline"
              >
                {inst.website}
              </a>
            </p>
            <p className="text-sm text-gray-500">
              Created at: {new Date(inst.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
