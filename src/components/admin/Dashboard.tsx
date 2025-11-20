// Dashboard.tsx
import React from "react";
import { Link } from "react-router-dom";

const Dashboard: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="px-6 py-5">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          Dashboard Admin
        </h3>
      </div>

      <div className="border-t border-gray-100 p-4 dark:border-gray-800 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white py-4 pl-4 pr-4 dark:border-gray-800 dark:bg-white/[0.03] xl:pr-5">
            <div className="flex items-center gap-4">
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-orange-500/[0.08] text-orange-500">
                <svg
                  className="fill-current"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M5.5 3.25C4.25736 3.25 3.25 4.25736 3.25 5.5V8.99998C3.25 10.2426 4.25736 11.25 5.5 11.25H9C10.2426 11.25 11.25 10.2426 11.25 8.99998V5.5C11.25 4.25736 10.2426 3.25 9 3.25H5.5ZM4.75 5.5C4.75 5.08579 5.08579 4.75 5.5 4.75H9C9.41421 4.75 9.75 5.08579 9.75 5.5V8.99998C9.75 9.41419 9.41421 9.74998 9 9.74998H5.5C5.08579 9.74998 4.75 9.41419 4.75 8.99998V5.5ZM5.5 12.75C4.25736 12.75 3.25 13.7574 3.25 15V18.5C3.25 19.7426 4.25736 20.75 5.5 20.75H9C10.2426 20.75 11.25 19.7427 11.25 18.5V15C11.25 13.7574 10.2426 12.75 9 12.75H5.5ZM4.75 15C4.75 14.5858 5.08579 14.25 5.5 14.25H9C9.41421 14.25 9.75 14.5858 9.75 15V18.5C9.75 18.9142 9.41421 19.25 9 19.25H5.5C5.08579 19.25 4.75 18.9142 4.75 18.5V15ZM12.75 5.5C12.75 4.25736 13.7574 3.25 15 3.25H18.5C19.7426 3.25 20.75 4.25736 20.75 5.5V8.99998C20.75 10.2426 19.7426 11.25 18.5 11.25H15C13.7574 11.25 12.75 10.2426 12.75 8.99998V5.5ZM15 4.75C14.5858 4.75 14.25 5.08579 14.25 5.5V8.99998C14.25 9.41419 14.5858 9.74998 15 9.74998H18.5C18.9142 9.74998 19.25 9.41419 19.25 8.99998V5.5C19.25 5.08579 18.9142 4.75 18.5 4.75H15ZM15 12.75C13.7574 12.75 12.75 13.7574 12.75 15V18.5C12.75 19.7426 13.7574 20.75 15 20.75H18.5C19.7426 20.75 20.75 19.7427 20.75 18.5V15C20.75 13.7574 19.7426 12.75 18.5 12.75H15ZM14.25 15C14.25 14.5858 14.5858 14.25 15 14.25H18.5C18.9142 14.25 19.25 14.5858 19.25 15V18.5C19.25 18.9142 18.9142 19.25 18.5 19.25H15C14.5858 19.25 14.25 18.9142 14.25 18.5V15Z"
                  />
                </svg>
              </div>

              <div>
                <h4 className="mb-1 text-sm font-medium text-gray-800 dark:text-white/90">
                  <Link to="/admin/account">Slash Account</Link>
                </h4>
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Manage Accounts
                </span>
              </div>
            </div>

            <div></div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white py-4 pl-4 pr-4 dark:border-gray-800 dark:bg-white/[0.03] xl:pr-5">
            <div className="flex items-center gap-4">
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-warning-500/[0.08] text-warning-500">
                <svg
                  className="fill-current"
                  width="25"
                  height="24"
                  viewBox="0 0 25 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12.5 4C10.8431 4 9.5 5.34315 9.5 7C9.5 8.65685 10.8431 10 12.5 10C14.1569 10 15.5 8.65685 15.5 7C15.5 5.34315 14.1569 4 12.5 4ZM8 7C8 4.79086 9.79086 3 12.5 3C15.2091 3 17 4.79086 17 7C17 9.20914 15.2091 11 12.5 11C9.79086 11 8 9.20914 8 7Z"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M7.11829 14.4301C8.32521 13.509 10.0447 13 12.5 13C14.9553 13 16.6748 13.509 17.8817 14.4301C19.0789 15.3435 19.75 16.6149 19.75 18V19C19.75 19.4142 19.4142 19.75 19 19.75C18.5858 19.75 18.25 19.4142 18.25 19V18C18.25 17.2399 17.8711 16.5708 16.9688 15.8952C16.0762 15.2265 14.6207 14.75 12.5 14.75C10.3793 14.75 8.92379 15.2265 8.0312 15.8952C7.12894 16.5708 6.75 17.2399 6.75 18V19C6.75 19.4142 6.41421 19.75 6 19.75C5.58579 19.75 5.25 19.4142 5.25 19V18C5.25 16.6149 5.92106 15.3435 7.11829 14.4301Z"
                  />
                </svg>
              </div>

              <div>
                <h4 className="mb-1 text-sm font-medium text-gray-800 dark:text-white/90">
                  <Link to="/admin/users"> Users Management</Link>
                </h4>
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                 Manage Accounts
                </span>
              </div>
            </div>

            <div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
