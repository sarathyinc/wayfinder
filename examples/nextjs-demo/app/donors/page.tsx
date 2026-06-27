"use client";

import React from "react";

export default function Donors() {
  const [form, setForm] = React.useState({ unosId: "", creatinine: "" });

  return (
    <div>
      <h1>Donor Records</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          alert("Saved (demo)");
        }}
      >
        <label>
          UNOS ID
          <input
            value={form.unosId}
            onChange={(e) => setForm({ ...form, unosId: e.target.value })}
          />
        </label>
        <br />
        <div>
          <h3>Labs tab</h3>
          <label>
            Terminal Creatinine
            <input
              value={form.creatinine}
              onChange={(e) => setForm({ ...form, creatinine: e.target.value })}
            />
          </label>
        </div>
        <button type="submit">Save Donor</button>
      </form>
      <a href="/inbox">Back to Inbox</a>
    </div>
  );
}
