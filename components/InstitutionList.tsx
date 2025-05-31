// components/InstitutionList.tsx

"use client";

import { type Institution } from "@/app/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InstitutionListProps {
  institutions: Institution[];
}

export default function InstitutionList({
  institutions,
}: InstitutionListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Danh sách tổ chức</CardTitle>
      </CardHeader>
      <CardContent>
        {institutions.length === 0 ? (
          <p className="text-center text-gray-500">Chưa có tổ chức nào</p>
        ) : (
          <div className="space-y-4">
            {institutions.map((institution) => (
              <div key={institution.id} className="p-4 border rounded-lg">
                <h3 className="font-semibold">
                  {institution.institution_name}
                </h3>
                <p className="text-sm text-gray-600">{institution.email}</p>
                <p className="text-sm text-gray-600">{institution.website}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
