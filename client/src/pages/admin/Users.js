import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../components/Layout';
import AdminMenu from '../../components/AdminMenu';
import toast from "react-hot-toast";
import { useAuth } from "../../context/auth";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [auth] = useAuth();

  // Fetch all users from the backend
  const getUsers = async () => {
    try {
      const { data } = await axios.get("/api/v1/auth/all-users");
      if (data?.success) {
        setUsers(data?.users);
      } else {
        toast.error(data?.message || "Failed to fetch users");
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong in getting users");
    }
  };

  // Handle user deletion with confirmation and API call
  const handleDelete = async (id) => {
    // Standard browser confirmation for destructive actions
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const { data } = await axios.delete(`/api/v1/auth/delete-user/${id}`);
      if (data?.success) {
        toast.success("User deleted successfully");
        getUsers(); // Refresh the list to reflect changes
      } else {
        toast.error(data?.message || "Failed to delete user");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete user");
    }
  };

  // Handle role update (Admin <-> User)
  const handleUpdateRole = async (id, newRole) => {
    try {
      const { data } = await axios.put(`/api/v1/auth/update-role/${id}`, {
        role: newRole,
      });
      if (data?.success) {
        toast.success("Role updated!");
        getUsers(); // Refresh the list to reflect changes
      } else {
        toast.error(data?.message || "Failed to update role");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to update role");
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  // Safety Logic: Count current admins to prevent self-lockout
  const adminCount = users.filter(u => u.role === 1).length;

  return (
    <Layout title={"Dashboard - All Users"}>
      <div className="container-fluid m-3 p-3">
        <div className="row">
          <div className="col-md-3">
            <AdminMenu />
          </div>
          <div className="col-md-9">
            <h1>All Users List</h1>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users?.length > 0 ? (
                  users.map((u, i) => {
                    // Safety Guard: Disable actions if it's the last remaining admin
                    const isLastAdmin = u.role === 1 && adminCount <= 1;
                    const isMe = u._id === auth?.user?._id;
                    return (
                      <tr key={u._id}>
                        <td>{i + 1}</td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.phone}</td>
                        <td>
                          <div className="d-flex gap-2">
                            {/* Role Toggle Button */}
                            <button
                              className={`btn ${u.role === 1 ? 'btn-danger' : 'btn-success'} w-100`}
                              style={{ maxWidth: "100px" }}
                              onClick={() => handleUpdateRole(u._id, u.role === 1 ? 0 : 1)}
                              disabled={isLastAdmin}
                              title={isLastAdmin ? "Cannot demote the last admin" : "Change Role"}
                            >
                              {u.role === 1 ? "Admin" : "User"}
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDelete(u._id)}
                              disabled={isMe}
                              title={isMe ? "You cannot delete your own account" : "Delete User"}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Users;