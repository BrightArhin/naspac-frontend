import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Table,
  Typography,
  Space,
  message,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { toast } from "react-toastify";
import "../components/PersonnelSelection.css";
import { API_BASE_URL } from "../lib/api-config";

const apiBase = API_BASE_URL;

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
  const [editing, setEditing] = useState<OnboardedPerson | null>(null);
  const [saving, setSaving] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [resendTarget, setResendTarget] = useState<OnboardedPerson | null>(
    null,
  );
  const [form] = Form.useForm();

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  });

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (person: OnboardedPerson) => {
    setEditing(person);
    form.setFieldsValue({
      nssNumber: person.nssNumber,
      email: person.email,
      phoneNumber: person.phoneNumber,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${apiBase}/auth/onboarded/${editing.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update personnel");
      }
      setPeople((current) =>
        current.map((person) =>
          person.id === editing.id ? { ...person, ...data } : person,
        ),
      );
      toast.success("Personnel details updated");
      setEditing(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to update personnel");
    } finally {
      setSaving(false);
    }
  };

  const confirmResend = async () => {
    if (!resendTarget) return;
    const person = resendTarget;
    setResendingId(person.id);
    try {
      const response = await fetch(`${apiBase}/auth/renew-token/${person.id}`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to resend the email");
      }
      setResendTarget(null);
      message.success(
        data.message ||
          `Onboarding email sent to ${data.email || person.email}`,
      );
      toast.success(
        data.message ||
          `Onboarding email sent to ${data.email || person.email}`,
      );
    } catch (error: any) {
      message.error(error.message || "Failed to resend the email");
      toast.error(error.message || "Failed to resend the email");
    } finally {
      setResendingId(null);
    }
  };

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
        <h2 className="mb-4 text-xl font-semibold tracking-tight text-[#2c241f]">
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
            {
              title: "Action",
              key: "action",
              render: (_: unknown, person: OnboardedPerson) => (
                <Space>
                  <Button
                    className="naspac-btn-secondary"
                    onClick={() => openEdit(person)}
                  >
                    Edit
                  </Button>
                  <Button
                    className="naspac-btn-primary"
                    loading={resendingId === person.id}
                    onClick={() => setResendTarget(person)}
                  >
                    Resend email
                  </Button>
                </Space>
              ),
            },
          ]}
        />
        <Modal
          title="Resend onboarding email"
          open={!!resendTarget}
          onCancel={() => setResendTarget(null)}
          footer={[
            <Button
              key="cancel"
              className="naspac-btn-secondary"
              onClick={() => setResendTarget(null)}
            >
              Cancel
            </Button>,
            <Button
              key="resend"
              className="naspac-btn-primary"
              loading={resendingId !== null}
              onClick={confirmResend}
            >
              Send email
            </Button>,
          ]}
        >
          <p>
            Send a new set-password link to{" "}
            <strong>{resendTarget?.email || "this personnel"}</strong>? The link
            is valid for 24 hours.
          </p>
        </Modal>
        <Modal
          title="Edit personnel"
          open={!!editing}
          onCancel={() => setEditing(null)}
          footer={[
            <Button
              key="cancel"
              className="naspac-btn-secondary"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>,
            <Button
              key="save"
              className="naspac-btn-primary"
              loading={saving}
              onClick={saveEdit}
            >
              Save
            </Button>,
          ]}
        >
          <Form form={form} layout="vertical" className="mt-4">
            <Form.Item
              name="nssNumber"
              label="NSS number"
              rules={[{ required: true, message: "Enter the NSS number" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Enter the email" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="phoneNumber"
              label="Mobile number"
              rules={[
                { required: true, message: "Enter the mobile number" },
                {
                  pattern: /^\+?\d{10,15}$/,
                  message: "Use 10-15 digits, with an optional +",
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default Onboarded;
