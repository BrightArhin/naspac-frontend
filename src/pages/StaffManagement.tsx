import React, { useState, useEffect } from "react";
import {
  Table,
  Select,
  Button,
  Typography,
  Modal,
  Form,
  Input,
  Space,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { toast } from "react-toastify";
import { useAuth } from "../AuthContext";
import "../components/PersonnelSelection.css";
import { API_BASE_URL } from "../lib/api-config";

const { Option } = Select;
const { Text } = Typography;

interface Department {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  staffId: string;
  name: string;
  email: string;
  phoneNumber: string; // Added phoneNumber to Staff interface
  role: "ADMIN" | "STAFF" | "SUPERVISOR";
  departmentsSupervised: Department[];
}

const StaffManagement: React.FC = () => {
  const { role } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [filteredStaffList, setFilteredStaffList] = useState<Staff[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  // Define API base URL
  const apiBase = API_BASE_URL;

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiBase}/users/staff`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data: Staff[] = await response.json();
        if (response.ok) {
          setStaffList(data);
          setFilteredStaffList(data);
        } else {
          toast.error((data as any).message || "Failed to load staff");
        }
      } catch (error) {
        toast.error("Failed to load staff");
      } finally {
        setLoading(false);
      }
    };
    if (role === "ADMIN") {
      fetchStaff();
    }
  }, [role]);

  useEffect(() => {
    let filtered = staffList;
    if (roleFilter !== "All") {
      filtered = staffList.filter((s) => s.role === roleFilter);
    }
    setFilteredStaffList(filtered);
  }, [roleFilter, staffList]);

  const handleCreateUser = async (values: {
    staffId: string;
    name: string;
    email: string;
    phoneNumber: string;
    role: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/auth/init-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (response.ok) {
        setStaffList((prev) => [
          ...prev,
          { ...data, departmentsSupervised: [] },
        ]);
        setFilteredStaffList((prev) => [
          ...prev,
          { ...data, departmentsSupervised: [] },
        ]);
        setCreateModalVisible(false);
        form.resetFields();
        toast.success("User created successfully");
        window.location.reload();
      } else {
        toast.error(data.message || "Failed to create user");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (values: {
    staffId: string;
    name: string;
    email: string;
    phoneNumber: string;
    role: string;
  }) => {
    if (!selectedStaff) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${apiBase}/users/staff/${selectedStaff.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(values),
        },
      );
      const data = await response.json();
      if (response.ok) {
        setStaffList((prev) =>
          prev.map((staff) =>
            staff.id === selectedStaff.id ? { ...staff, ...data } : staff,
          ),
        );
        setFilteredStaffList((prev) =>
          prev.map((staff) =>
            staff.id === selectedStaff.id ? { ...staff, ...data } : staff,
          ),
        );
        setEditModalVisible(false);
        editForm.resetFields();
        toast.success("User updated successfully");
      } else {
        toast.error(data.message || "Failed to update user");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedStaff) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${apiBase}/users/staff/${selectedStaff.id}/delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (response.ok) {
        setStaffList((prev) =>
          prev.filter((staff) => staff.id !== selectedStaff.id),
        );
        setFilteredStaffList((prev) =>
          prev.filter((staff) => staff.id !== selectedStaff.id),
        );
        setEditModalVisible(false);
        setConfirmDeleteVisible(false);
        toast.success("User deleted successfully");
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to delete user");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  if (!role || role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center h-full">
        <Text className="text-lg text-[#3C3939]">Access restricted.</Text>
      </div>
    );
  }

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 120,
      ellipsis: true,
    },
    {
      title: "Staff ID",
      dataIndex: "staffId",
      key: "staffId",
      width: 100,
      ellipsis: true,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 160,
      ellipsis: true,
    },
    {
      title: "Phone",
      dataIndex: "phoneNumber", // Added Phone column
      key: "phoneNumber",
      width: 120,
      ellipsis: true,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 70,
      render: (role: string) => (
        <span className={`status-${role.toLowerCase()}`}>
          {role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}
        </span>
      ),
    },
    {
      title: "Department",
      dataIndex: "departmentsSupervised",
      key: "department",
      width: 160,
      ellipsis: true,
      render: (departments: Department[]) =>
        departments.length > 0
          ? departments.map((dept) => dept.name).join(", ")
          : "",
    },
    {
      title: "Action",
      key: "action",
      width: 50,
      ellipsis: true,
      render: (_: any, record: Staff) => (
        <Button
          type="link"
          icon={<EditOutlined className="!text-[#5B3418]" />}
          onClick={() => {
            setSelectedStaff(record);
            setEditModalVisible(true);
            editForm.setFieldsValue({
              name: record.name,
              staffId: record.staffId,
              email: record.email,
              phoneNumber: record.phoneNumber, // Added phoneNumber
              role: record.role,
            });
          }}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-screen px-2 py-4">
      <div className="w-full max-w-full mx-auto">
        <h2 className="mb-4 text-xl font-semibold tracking-tight text-[#2c241f]">
          Staff Management
        </h2>
        <div className="flex flex-col sm:flex-row justify-between mb-3 gap-2">
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              className="naspac-btn-primary"
            >
              Create User
            </Button>
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              className="rounded-md w-fit sm:w-48"
              placeholder="Filter by role"
            >
              <Option value="All">All</Option>
              <Option value="ADMIN">Admin</Option>
              <Option value="STAFF">Staff</Option>
              <Option value="SUPERVISOR">Supervisor</Option>
            </Select>
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={filteredStaffList}
          rowKey="id"
          loading={loading}
          className="rounded-md"
          scroll={{ x: "max-content" }}
          size="large"
          pagination={{ pageSize: 10 }}
        />
        {/* Create User Modal */}
        <Modal
          title="Create New User"
          open={createModalVisible}
          onCancel={() => {
            setCreateModalVisible(false);
            form.resetFields();
          }}
          footer={null}
          className="centered-modal"
        >
          <Form
            form={form}
            onFinish={handleCreateUser}
            layout="vertical"
            className="mt-4"
          >
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true, message: "Please enter full name" }]}
            >
              <Input placeholder="Enter full name" />
            </Form.Item>
            <Form.Item
              name="staffId"
              label="Staff ID"
              rules={[{ required: true, message: "Please enter staff ID" }]}
            >
              <Input placeholder="Enter staff ID" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please enter email" },
                { type: "email", message: "Please enter a valid email" },
              ]}
            >
              <Input placeholder="Enter email" />
            </Form.Item>
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[
                { required: true, message: "Please enter phone number" },
                {
                  pattern: /^\+?\d{10,15}$/,
                  message:
                    "Please enter a valid phone number (10-15 digits, optional +)",
                },
              ]}
            >
              <Input placeholder="Enter phone number" type="tel" />
            </Form.Item>
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Please select a role" }]}
            >
              <Select placeholder="Select role">
                <Option value="ADMIN">Admin</Option>
                <Option value="STAFF">Staff</Option>
                <Option value="SUPERVISOR">Supervisor</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  className="naspac-btn-primary"
                >
                  Create
                </Button>
                <Button
                  className="naspac-btn-secondary"
                  onClick={() => {
                    setCreateModalVisible(false);
                    form.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
        {/* Edit User Modal */}
        <Modal
          title="Edit User"
          open={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false);
            setSelectedStaff(null);
            editForm.resetFields();
          }}
          footer={null}
          className="centered-modal"
        >
          <Form
            form={editForm}
            onFinish={handleUpdateUser}
            layout="vertical"
            className="mt-4"
          >
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true, message: "Please enter full name" }]}
            >
              <Input placeholder="Enter full name" />
            </Form.Item>
            <Form.Item
              name="staffId"
              label="Staff ID"
              rules={[{ required: true, message: "Please enter staff ID" }]}
            >
              <Input placeholder="Enter staff ID" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please enter email" },
                { type: "email", message: "Please enter a valid email" },
              ]}
            >
              <Input placeholder="Enter email" />
            </Form.Item>
            <Form.Item
              name="phoneNumber"
              label="Phone Number"
              rules={[
                { required: true, message: "Please enter phone number" },
                {
                  pattern: /^\+?\d{10,15}$/,
                  message:
                    "Please enter a valid phone number (10-15 digits, optional +)",
                },
              ]}
            >
              <Input placeholder="Enter phone number" type="tel" />
            </Form.Item>
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Please select a role" }]}
            >
              <Select placeholder="Select role">
                <Option value="ADMIN">Admin</Option>
                <Option value="STAFF">Staff</Option>
                <Option value="SUPERVISOR">Supervisor</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <div className="flex justify-between">
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="naspac-btn-primary"
                  >
                    Update
                  </Button>
                  <Button
                    className="naspac-btn-secondary"
                    onClick={() => {
                      setEditModalVisible(false);
                      setSelectedStaff(null);
                      editForm.resetFields();
                    }}
                  >
                    Cancel
                  </Button>
                </Space>
                <Button
                  className="naspac-btn-danger"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setConfirmDeleteVisible(true)}
                  loading={loading}
                >
                  Delete
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Modal>
        {/* Delete Confirmation Modal */}
        <Modal
          title="Confirm Delete"
          open={confirmDeleteVisible}
          onOk={handleDeleteUser}
          onCancel={() => setConfirmDeleteVisible(false)}
          okText="Delete"
          okButtonProps={{
            danger: true,
            className: "naspac-btn-danger",
            loading: loading,
          }}
          cancelButtonProps={{ disabled: loading, className: "naspac-btn-secondary" }}
          className="centered-modal"
        >
          <p>
            Are you sure you want to delete this user? This action cannot be
            undone.
          </p>
        </Modal>
      </div>
    </div>
  );
};

export default StaffManagement;
