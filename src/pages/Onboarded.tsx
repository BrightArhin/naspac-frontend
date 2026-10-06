import React, { useEffect, useState } from "react";
import { Table, Input, Typography, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { toast } from "react-toastify";
import "../components/PersonnelSelection.css";

const apiBase = import.meta.env.VITE_API_BASE_URL || "https://nss.cocobod.net";

const { Text } = Typography;

interface OnboardedPerson {
  id: number;
  name: string;
  nssNumber: string;
  email: string;
  phoneNumber: string;
  status: string;
}

const statusLabel: Record<string, string> = {
  AWAITING_FORM: "Waiting for form",
  PENDING: "Form submitted",
  PENDING_ENDORSEMENT: "Shortlisted",
  ENDORSED: "Endorsed",
  VALIDATED: "Validated",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

const Onboarded: React.FC = () => {
  const [people, setPeople] = useState<OnboardedPerson[]>([]);
  const [filtered, setFiltered] = useState<OnboardedPerson[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiBase}/auth/onboarded`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to load onboarded personnel");
        }
        setPeople(data);
        setFiltered(data);
      } catch (error: any) {
        toast.error(error.message || "Failed to load onboarded personnel");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      setFiltered(people);
      return;
    }
    setFiltered(
      people.filter((person) =>
        [person.name, person.nssNumber, person.email, person.phoneNumber]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term)),
      ),
    );
  }, [searchTerm, people]);

  return (
    <div className="flex flex-col px-2 py-4">
      <div className="w-full max-w-full mx-auto">
        <h2 className="text-xl font-bold text-[#3C3939] mb-4 text-center">
          Onboarded Personnel
        </h2>
        <div className="flex flex-col sm:flex-row justify-between mb-3 gap-2">
          <Text className="text-base font-semibold text-[#5B3418] bg-amber-100 px-3 py-1 rounded-md">
            Total Onboarded: {people.length}
          </Text>
          <Space className="w-full sm:w-auto">
            <Input
              placeholder="Search by name, NSS, email, or phone"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              prefix={<SearchOutlined />}
              className="rounded-md border-[#a9a7a7] w-full sm:w-80"
            />
          </Space>
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={filtered}
          scroll={{ x: "max-content" }}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: "Name",
              dataIndex: "name",
              render: (value: string) => value || "—",
            },
            { title: "NSS Number", dataIndex: "nssNumber" },
            { title: "Email", dataIndex: "email" },
            {
              title: "Telephone",
              dataIndex: "phoneNumber",
              render: (value: string) => value || "—",
            },
            {
              title: "Status",
              dataIndex: "status",
              render: (value: string) => statusLabel[value] || value,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default Onboarded;
