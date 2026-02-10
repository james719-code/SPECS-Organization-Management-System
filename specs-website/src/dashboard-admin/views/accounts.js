import { databases, storage, functions, account } from '../../shared/appwrite.js';
import {
    DATABASE_ID,
    COLLECTION_ID_ACCOUNTS,
    COLLECTION_ID_STUDENTS,
    COLLECTION_ID_OFFICERS,
    BUCKET_ID_RESUMES,
    BUCKET_ID_SCHEDULES,
    FUNCTION_ID
} from '../../shared/constants.js';
import { Query } from 'appwrite';
import { Modal, Dropdown } from 'bootstrap';
import toast from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';
import { logActivity } from './activity-logs.js';

import checkCircle from 'bootstrap-icons/icons/check-circle.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import threeDotsVertical from 'bootstrap-icons/icons/three-dots-vertical.svg';
import person from 'bootstrap-icons/icons/person.svg';
import mortarboard from 'bootstrap-icons/icons/mortarboard.svg';
import fileEarmarkPerson from 'bootstrap-icons/icons/file-earmark-person.svg';
import calendarWeek from 'bootstrap-icons/icons/calendar-week.svg';
import funnelFill from 'bootstrap-icons/icons/funnel-fill.svg';
import sortAlphaDown from 'bootstrap-icons/icons/sort-alpha-down.svg';
import sortNumericDown from 'bootstrap-icons/icons/sort-numeric-down.svg';
import award from 'bootstrap-icons/icons/award.svg';
import arrowRepeat from 'bootstrap-icons/icons/arrow-repeat.svg';
import arrowDown from 'bootstrap-icons/icons/arrow-down.svg';
import personSlash from 'bootstrap-icons/icons/person-slash.svg';
import personCheck from 'bootstrap-icons/icons/person-check.svg';
import key from 'bootstrap-icons/icons/key.svg';
import personGear from 'bootstrap-icons/icons/person-gear.svg';
import checkAll from 'bootstrap-icons/icons/check-all.svg';
import download from 'bootstrap-icons/icons/download.svg';
import fileCsv from 'bootstrap-icons/icons/file-earmark-spreadsheet.svg';
import envelope from 'bootstrap-icons/icons/envelope.svg';
import people from 'bootstrap-icons/icons/people.svg';
import personBadge from 'bootstrap-icons/icons/person-badge.svg';
import hourglassSplit from 'bootstrap-icons/icons/hourglass-split.svg';
import shieldCheck from 'bootstrap-icons/icons/shield-check.svg';
import eye from 'bootstrap-icons/icons/eye.svg';
import clock from 'bootstrap-icons/icons/clock.svg';
import at from 'bootstrap-icons/icons/at.svg';

const ACCOUNTS_PER_PAGE = 12;

/**
 * Export accounts data to CSV format
 */
function exportToCSV(accounts, filename = 'accounts-export.csv') {
    const headers = ['Username', 'Name', 'Email', 'Type', 'Year Level', 'Section', 'Student ID', 'Verified', 'Deactivated', 'Joined Date'];

    const rows = accounts.map(acc => {
        const studentData = acc.students || {};
        return [
            acc.username || '',
            studentData.name || '',
            studentData.email || '',
            acc.type || '',
            studentData.yearLevel || '',
            studentData.section || '',
            studentData.student_id || '',
            acc.verified ? 'Yes' : 'No',
            acc.deactivated ? 'Yes' : 'No',
            new Date(acc.$createdAt).toLocaleDateString()
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${accounts.length} accounts to CSV`, { title: 'Export Complete' });
}

// Action menu item HTML templates with improved styling
const acceptIconHTML = `<img src="${checkCircle}" alt="Accept" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em; filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(87deg) brightness(119%) contrast(119%);">Accept Student`;
const promoteIconHTML = `<img src="${award}" alt="Promote" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em; filter: invert(29%) sepia(98%) saturate(1679%) hue-rotate(199deg) brightness(97%) contrast(101%);">Promote to Officer`;
const demoteIconHTML = `<img src="${arrowDown}" alt="Demote" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em; filter: invert(50%) sepia(98%) saturate(456%) hue-rotate(346deg) brightness(91%) contrast(95%);">Demote to Student`;
const deactivateIconHTML = `<img src="${personSlash}" alt="Deactivate" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em; filter: invert(50%) sepia(98%) saturate(456%) hue-rotate(346deg) brightness(91%) contrast(95%);">Deactivate Account`;
const reactivateIconHTML = `<img src="${personCheck}" alt="Reactivate" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em; filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(87deg) brightness(119%) contrast(119%);">Reactivate Account`;
const resetPasswordIconHTML = `<img src="${key}" alt="Reset Password" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em; filter: invert(45%) sepia(8%) saturate(12%) hue-rotate(316deg) brightness(95%) contrast(91%);">Reset Password`;
const manageRoleIconHTML = `<img src="${personGear}" alt="Manage" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em; opacity: 0.6;">Manage Role`;
const deleteIconHTML = `<img src="${trash}" alt="Delete" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em; filter: invert(21%) sepia(30%) saturate(7469%) hue-rotate(348deg) brightness(98%) contrast(92%);">Delete Account`;
const viewDetailsIconHTML = `<img src="${eye}" alt="View" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em; opacity: 0.6;">View Details`;

function createAccountCardHTML(account, showCheckbox = false) {
    const isVerified = account.verified === true;
    const isOfficer = account.type === 'officer';
    const isStudent = account.type === 'student';
    const isDeactivated = account.deactivated === true;

    // Determine card accent color based on status
    let accentColor, avatarBg, statusIcon, statusText, statusClass;
    if (isDeactivated) {
        accentColor = 'var(--bs-secondary)';
        avatarBg = 'bg-secondary';
        statusIcon = 'bi-person-slash';
        statusText = 'Deactivated';
        statusClass = 'status-deactivated';
    } else if (isOfficer) {
        accentColor = 'var(--bs-info)';
        avatarBg = 'bg-info';
        statusIcon = 'bi-shield-check';
        statusText = 'Officer';
        statusClass = 'status-officer';
    } else if (isVerified) {
        accentColor = 'var(--bs-success)';
        avatarBg = 'bg-success';
        statusIcon = 'bi-patch-check-fill';
        statusText = 'Verified';
        statusClass = 'status-verified';
    } else {
        accentColor = 'var(--bs-warning)';
        avatarBg = 'bg-warning';
        statusIcon = 'bi-hourglass-split';
        statusText = 'Pending';
        statusClass = 'status-pending';
    }

    const joinedDate = new Date(account.$createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const joinedRelative = getRelativeTime(new Date(account.$createdAt));

    let actions = '';
    let quickAction = '';

    // Accept (only for unverified students who are not deactivated)
    if (!isVerified && isStudent && !isDeactivated) {
        actions += `<li><a class="dropdown-item accept-btn py-2" href="#" data-docid="${account.$id}">${acceptIconHTML}</a></li>`;
        quickAction = `<button class="btn btn-success btn-sm quick-accept-btn px-3 rounded-pill" data-docid="${account.$id}" title="Accept this student">
            <i class="bi bi-check-lg me-1"></i>Accept
        </button>`;
    }

    // Promote (only for verified students who are not officers and not deactivated)
    if (isVerified && isStudent && !isDeactivated) {
        actions += `<li><a class="dropdown-item promote-btn py-2" href="#" data-docid="${account.$id}">${promoteIconHTML}</a></li>`;
        quickAction = `<button class="btn btn-outline-primary btn-sm quick-promote-btn px-3 rounded-pill" data-docid="${account.$id}" title="Promote to officer">
            <i class="bi bi-arrow-up-circle me-1"></i>Promote
        </button>`;
    }

    // Demote (only for officers)
    if (isOfficer && !isDeactivated) {
        actions += `<li><a class="dropdown-item demote-btn py-2" href="#" data-docid="${account.$id}">${demoteIconHTML}</a></li>`;
        quickAction = `<button class="btn btn-outline-warning btn-sm quick-demote-btn px-3 rounded-pill" data-docid="${account.$id}" title="Demote to student">
            <i class="bi bi-arrow-down-circle me-1"></i>Demote
        </button>`;
    }

    // View details option
    actions += `<li><a class="dropdown-item view-details-btn py-2" href="#" data-docid="${account.$id}" data-bs-toggle="modal" data-bs-target="#userDetailsModal">${viewDetailsIconHTML}</a></li>`;
    actions += `<li><hr class="dropdown-divider my-1"></li>`;

    // Reset password (available for all non-admin accounts)
    actions += `<li><a class="dropdown-item reset-password-btn py-2" href="#" data-docid="${account.$id}">${resetPasswordIconHTML}</a></li>`;

    // Deactivate / Reactivate toggle
    if (isDeactivated) {
        actions += `<li><a class="dropdown-item reactivate-btn py-2" href="#" data-docid="${account.$id}">${reactivateIconHTML}</a></li>`;
        quickAction = `<button class="btn btn-success btn-sm quick-reactivate-btn px-3 rounded-pill" data-docid="${account.$id}" title="Reactivate account">
            <i class="bi bi-person-check me-1"></i>Reactivate
        </button>`;
    } else {
        actions += `<li><a class="dropdown-item deactivate-btn py-2" href="#" data-docid="${account.$id}">${deactivateIconHTML}</a></li>`;
    }

    // Divider before destructive action
    actions += `<li><hr class="dropdown-divider my-1"></li>`;

    // Delete (always available)
    actions += `<li><a class="dropdown-item delete-btn py-2 text-danger" href="#" data-docid="${account.$id}">${deleteIconHTML}</a></li>`;

    const studentData = (account.students && typeof account.students === 'object') ? account.students : {};
    const displayName = studentData.name || account.username;
    const displayEmail = studentData.email || 'No email linked';
    const displayYear = studentData.yearLevel ? `Year ${studentData.yearLevel}` : null;
    const displaySection = studentData.section || null;
    const displayStudentId = studentData.student_id || null;
    const isVolunteer = studentData.is_volunteer === true;

    return `
        <div class="col">
            <div class="card h-100 account-card border-0 ${statusClass} ${isDeactivated ? 'deactivated' : ''}" data-docid="${account.$id}">
                <div class="card-accent" style="background: ${accentColor};"></div>
                <div class="card-body d-flex flex-column p-0">
                    ${showCheckbox ? `
                    <div class="bulk-checkbox-wrapper">
                        <input class="form-check-input account-checkbox" type="checkbox" value="${account.$id}" data-username="${displayName}">
                    </div>` : ''}
                    
                    <!-- Card Header -->
                    <div class="card-header-section p-3 pb-0">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="d-flex align-items-center flex-grow-1 min-width-0 user-info-trigger" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#userDetailsModal">
                                <div class="avatar-wrapper position-relative me-3">
                                    <div class="avatar-placeholder ${avatarBg} text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style="width: 52px; height: 52px; font-size: 1.25rem;">
                                        ${displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span class="status-indicator position-absolute" title="${statusText}">
                                        <i class="bi ${statusIcon}"></i>
                                    </span>
                                </div>
                                <div class="user-info min-width-0">
                                    <h6 class="card-title fw-bold mb-1 text-dark text-truncate" title="${displayName}">${displayName}</h6>
                                    <div class="d-flex align-items-center text-muted small">
                                        <img src="${at}" class="me-1 opacity-50" style="width: 0.85rem;">
                                        <span class="text-truncate">${account.username}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="dropdown ms-2">
                                <button class="btn btn-light btn-sm rounded-circle p-1 action-menu-btn" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Actions">
                                    <img src="${threeDotsVertical}" alt="Options" style="width: 1.1rem; height: 1.1rem; opacity: 0.7;">
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-3 py-2">
                                    ${actions}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Card Body: Metadata -->
                    <div class="card-meta-section px-3 py-3 user-info-trigger" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#userDetailsModal">
                        <div class="meta-grid">
                            ${displayEmail !== 'No email linked' ? `
                            <div class="meta-item">
                                <img src="${envelope}" class="meta-icon" style="width: 0.9rem;">
                                <span class="meta-text text-truncate" title="${displayEmail}">${displayEmail}</span>
                            </div>` : ''}
                            ${displayYear ? `
                            <div class="meta-item">
                                <img src="${mortarboard}" class="meta-icon" style="width: 0.9rem;">
                                <span class="meta-text">${displayYear}${displaySection ? ` - ${displaySection}` : ''}</span>
                            </div>` : ''}
                            ${displayStudentId ? `
                            <div class="meta-item">
                                <img src="${person}" class="meta-icon" style="width: 0.9rem;">
                                <span class="meta-text">${displayStudentId}</span>
                            </div>` : ''}
                            <div class="meta-item">
                                <img src="${clock}" class="meta-icon" style="width: 0.9rem;">
                                <span class="meta-text" title="Joined ${joinedDate}">${joinedRelative}</span>
                            </div>
                        </div>
                        ${isVolunteer ? `<span class="volunteer-badge mt-2"><i class="bi bi-hand-thumbs-up-fill me-1"></i>Volunteer</span>` : ''}
                    </div>

                    <!-- Card Footer -->
                    <div class="card-footer-section mt-auto px-3 py-3 border-top">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="status-badge ${statusClass}">
                                <i class="bi ${statusIcon} me-1"></i>${statusText}
                            </span>
                            ${quickAction}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Get relative time string (e.g., "2 days ago", "1 month ago")
 */
function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years}y ago`;
    if (months > 0) return `${months}mo ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

function getAccountsHTML() {
    return `
        <div class="admin-accounts-container">
            <!-- Page Header -->
            <div class="page-header mb-4">
                <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
                    <div>
                        <h2 class="fw-bold m-0 d-flex align-items-center gap-2">
                            <img src="${people}" alt="Accounts" style="width: 1.5rem; opacity: 0.7;">
                            Account Management
                        </h2>
                        <p class="text-muted m-0 mt-1">Manage accounts, verifications, and officer roles</p>
                    </div>
                    
                    <div class="d-flex flex-wrap gap-2 align-items-center">
                        <button id="refreshAccountsBtn" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 rounded-pill px-3" title="Refresh accounts">
                            <img src="${arrowRepeat}" alt="Refresh" style="width: 1rem; opacity: 0.6;">
                            <span class="d-none d-sm-inline">Refresh</span>
                        </button>
                        <button id="exportCsvBtn" class="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 rounded-pill px-3" title="Export to CSV">
                            <img src="${download}" alt="Export" style="width: 1rem; opacity: 0.7;">
                            <span class="d-none d-md-inline">Export</span>
                        </button>
                        <button id="toggleBulkModeBtn" class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 rounded-pill px-3" title="Bulk selection mode">
                            <img src="${checkAll}" alt="Bulk Mode" style="width: 1rem; opacity: 0.6;">
                            <span class="d-none d-md-inline">Select</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Statistics Cards -->
            <div class="row g-3 mb-4" id="statsCardsRow">
                <div class="col-6 col-md-3">
                    <div class="stat-card stat-total" data-filter="all">
                        <div class="stat-icon">
                            <img src="${people}" alt="Total" style="width: 1.5rem;">
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-total">-</div>
                            <div class="stat-label">Total Active</div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="stat-card stat-pending" data-filter="pending">
                        <div class="stat-icon">
                            <img src="${hourglassSplit}" alt="Pending" style="width: 1.5rem;">
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-pending">-</div>
                            <div class="stat-label">Pending</div>
                        </div>
                        <div class="stat-action" id="quickAcceptIndicator" style="display: none;">
                            <span class="badge bg-warning text-dark">Needs Action</span>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="stat-card stat-verified" data-filter="verified">
                        <div class="stat-icon">
                            <img src="${shieldCheck}" alt="Verified" style="width: 1.5rem;">
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-verified">-</div>
                            <div class="stat-label">Verified</div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="stat-card stat-officers" data-filter="officer">
                        <div class="stat-icon">
                            <img src="${personBadge}" alt="Officers" style="width: 1.5rem;">
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-officers">-</div>
                            <div class="stat-label">Officers</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Search Bar & Actions Row -->
            <div class="search-actions-bar mb-4">
                <div class="d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between">
                    <div class="search-wrapper flex-grow-1" style="max-width: 400px;">
                        <div class="input-group search-input-group">
                            <span class="input-group-text"><i class="bi bi-search"></i></span>
                            <input type="search" id="userSearchInput" class="form-control" placeholder="Search by name, email, or student ID...">
                            <button class="btn btn-outline-secondary d-none" id="clearSearchBtn" type="button">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div class="search-results-count small text-muted mt-1 d-none" id="searchResultsCount"></div>
                    </div>
                    
                    <div class="d-flex gap-2 flex-wrap">
                        <button id="bulkAcceptBtn" class="btn btn-success btn-sm d-flex align-items-center gap-2 rounded-pill px-3 shadow-sm" title="Accept all pending students" style="display: none;">
                            <i class="bi bi-check-all"></i>
                            <span>Accept All Pending</span>
                        </button>
                        <button id="bulkEmailBtn" class="btn btn-info btn-sm d-flex align-items-center gap-2 rounded-pill px-3 shadow-sm" title="Email selected users" style="display: none;">
                            <i class="bi bi-envelope"></i>
                            <span>Email Selected</span>
                        </button>
                        
                        <div class="dropdown">
                            <button class="btn btn-outline-secondary btn-sm dropdown-toggle d-flex align-items-center gap-2 rounded-pill px-3" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <img src="${funnelFill}" style="width: 0.9em; opacity: 0.7;"> 
                                <span id="currentSortLabel">Sort</span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-3">
                                <li><h6 class="dropdown-header text-uppercase small">Sort by</h6></li>
                                <li><a class="dropdown-item active py-2" href="#" data-sort="name_asc"><i class="bi bi-sort-alpha-down me-2"></i>Name (A-Z)</a></li>
                                <li><a class="dropdown-item py-2" href="#" data-sort="name_desc"><i class="bi bi-sort-alpha-up me-2"></i>Name (Z-A)</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item py-2" href="#" data-sort="date_desc"><i class="bi bi-calendar-minus me-2"></i>Newest First</a></li>
                                <li><a class="dropdown-item py-2" href="#" data-sort="date_asc"><i class="bi bi-calendar-plus me-2"></i>Oldest First</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Filter Tabs -->
            <div class="filter-tabs-wrapper mb-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <ul class="nav nav-pills gap-2 flex-wrap" id="accountFilterTabs">
                        <li class="nav-item">
                            <button class="nav-link active" data-filter="all">
                                <i class="bi bi-grid-3x3-gap me-1"></i>All
                                <span class="badge" id="count-all">-</span>
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-filter="pending">
                                <i class="bi bi-hourglass-split me-1"></i>Pending
                                <span class="badge" id="count-pending">-</span>
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-filter="verified">
                                <i class="bi bi-patch-check me-1"></i>Verified
                                <span class="badge" id="count-verified">-</span>
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-filter="officer">
                                <i class="bi bi-shield-check me-1"></i>Officers
                                <span class="badge" id="count-officers">-</span>
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" data-filter="deactivated">
                                <i class="bi bi-person-slash me-1"></i>Deactivated
                                <span class="badge" id="count-deactivated">-</span>
                            </button>
                        </li>
                    </ul>
                    
                    <div class="bulk-select-info d-none" id="bulkSelectInfo">
                        <span class="badge bg-primary rounded-pill px-3 py-2">
                            <span id="selectedCount">0</span> selected
                        </span>
                        <button class="btn btn-sm btn-link text-danger p-0 ms-2" id="clearSelectionBtn">Clear</button>
                    </div>
                </div>
            </div>
            
            <!-- Account Cards Grid -->
            <div id="user-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4">
                ${getSkeletonCards(8)}
            </div>
            
            <!-- Pagination -->
            <nav id="accountsPagination" class="mt-4" style="display: none;">
                <div class="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
                    <div class="pagination-info text-muted small" id="paginationInfo"></div>
                    <ul class="pagination pagination-sm mb-0"></ul>
                </div>
            </nav>

            <!-- User Details Modal -->
            <div class="modal fade" id="userDetailsModal" tabindex="-1" aria-labelledby="userDetailsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content border-0 shadow-lg rounded-4">
                        <div class="modal-header border-0 pb-0 px-4 pt-4">
                            <h5 class="modal-title fw-bold" id="userDetailsModalLabel">User Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-4" id="userDetailsModalBody">
                            <div class="d-flex justify-content-center py-5">
                                <div class="spinner-border text-primary" role="status"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            /* Page Header */
            .page-header {
                padding-bottom: 1rem;
                border-bottom: 1px solid #e9ecef;
            }
            
            /* Statistics Cards */
            .stat-card {
                background: white;
                border-radius: 16px;
                padding: 1.25rem;
                display: flex;
                align-items: center;
                gap: 1rem;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 1px solid #e9ecef;
                position: relative;
                overflow: hidden;
            }
            .stat-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
            }
            .stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.08);
            }
            .stat-card.active {
                border-color: var(--accent-color, #0d6b66);
                background: linear-gradient(135deg, rgba(13, 107, 102, 0.05), transparent);
            }
            .stat-total::before { background: var(--bs-primary); }
            .stat-pending::before { background: var(--bs-warning); }
            .stat-verified::before { background: var(--bs-success); }
            .stat-officers::before { background: var(--bs-info); }
            
            .stat-icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .stat-total .stat-icon { background: rgba(13, 110, 253, 0.1); }
            .stat-pending .stat-icon { background: rgba(255, 193, 7, 0.15); }
            .stat-verified .stat-icon { background: rgba(25, 135, 84, 0.1); }
            .stat-officers .stat-icon { background: rgba(13, 202, 240, 0.1); }
            
            .stat-value {
                font-size: 1.75rem;
                font-weight: 700;
                line-height: 1;
                color: #1a1a2e;
            }
            .stat-label {
                font-size: 0.8rem;
                color: #6c757d;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 0.25rem;
            }
            .stat-action {
                position: absolute;
                top: 0.75rem;
                right: 0.75rem;
            }
            
            /* Search Bar */
            .search-input-group {
                border-radius: 50px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            .search-input-group .input-group-text {
                background: white;
                border: 1px solid #e9ecef;
                border-right: none;
                padding-left: 1rem;
            }
            .search-input-group .form-control {
                border: 1px solid #e9ecef;
                border-left: none;
                padding-right: 1rem;
            }
            .search-input-group .form-control:focus {
                box-shadow: none;
                border-color: #e9ecef;
            }
            .search-input-group:focus-within {
                box-shadow: 0 0 0 3px rgba(13, 107, 102, 0.15);
            }
            
            /* Filter Tabs */
            #accountFilterTabs .nav-link {
                background-color: #f8f9fa;
                color: #6c757d;
                border: 1px solid transparent;
                border-radius: 50px;
                padding: 0.5rem 1rem;
                font-size: 0.875rem;
                font-weight: 500;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }
            #accountFilterTabs .nav-link:hover {
                background-color: #e9ecef;
                color: #495057;
            }
            #accountFilterTabs .nav-link.active {
                background: linear-gradient(135deg, #0d6b66, #0a5651);
                color: white;
                border-color: transparent;
                box-shadow: 0 4px 12px rgba(13, 107, 102, 0.3);
            }
            #accountFilterTabs .nav-link .badge {
                background: rgba(0,0,0,0.1);
                color: inherit;
                font-size: 0.7rem;
                padding: 0.25rem 0.5rem;
                border-radius: 50px;
                min-width: 1.5rem;
            }
            #accountFilterTabs .nav-link.active .badge {
                background: rgba(255,255,255,0.25);
            }
            
            /* Account Card Styles */
            .account-card {
                border-radius: 16px;
                overflow: hidden;
                transition: all 0.25s ease;
                background: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                position: relative;
            }
            .account-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 32px rgba(0,0,0,0.1);
            }
            .account-card.deactivated {
                opacity: 0.7;
            }
            .account-card.deactivated:hover {
                opacity: 1;
            }
            .card-accent {
                height: 4px;
                width: 100%;
            }
            
            .bulk-checkbox-wrapper {
                position: absolute;
                top: 12px;
                left: 12px;
                z-index: 10;
            }
            .bulk-checkbox-wrapper .form-check-input {
                width: 1.25rem;
                height: 1.25rem;
                cursor: pointer;
                border: 2px solid #dee2e6;
            }
            .bulk-checkbox-wrapper .form-check-input:checked {
                background-color: #0d6b66;
                border-color: #0d6b66;
            }
            
            .avatar-wrapper {
                position: relative;
            }
            .avatar-placeholder {
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .status-indicator {
                position: absolute;
                bottom: -2px;
                right: -2px;
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                font-size: 0.65rem;
            }
            .status-pending .status-indicator { color: var(--bs-warning); }
            .status-verified .status-indicator { color: var(--bs-success); }
            .status-officer .status-indicator { color: var(--bs-info); }
            .status-deactivated .status-indicator { color: var(--bs-secondary); }
            
            .user-info {
                min-width: 0;
            }
            .min-width-0 {
                min-width: 0;
            }
            
            .action-menu-btn {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .action-menu-btn:hover {
                background: #e9ecef;
            }
            
            /* Meta Grid */
            .meta-grid {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            .meta-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: #6c757d;
                font-size: 0.8rem;
            }
            .meta-icon {
                opacity: 0.5;
                flex-shrink: 0;
            }
            .meta-text {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .volunteer-badge {
                display: inline-flex;
                align-items: center;
                background: linear-gradient(135deg, #ffc107, #ff9800);
                color: white;
                font-size: 0.7rem;
                font-weight: 600;
                padding: 0.25rem 0.75rem;
                border-radius: 50px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            /* Status Badges */
            .status-badge {
                display: inline-flex;
                align-items: center;
                font-size: 0.75rem;
                font-weight: 600;
                padding: 0.35rem 0.75rem;
                border-radius: 50px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }
            .status-badge.status-pending {
                background: rgba(255, 193, 7, 0.15);
                color: #997404;
            }
            .status-badge.status-verified {
                background: rgba(25, 135, 84, 0.1);
                color: #0f5132;
            }
            .status-badge.status-officer {
                background: rgba(13, 202, 240, 0.15);
                color: #055160;
            }
            .status-badge.status-deactivated {
                background: rgba(108, 117, 125, 0.15);
                color: #495057;
            }
            
            .card-footer-section {
                background: #fafbfc;
            }
            
            /* Quick Action Buttons */
            .quick-accept-btn, .quick-promote-btn, .quick-demote-btn, .quick-reactivate-btn {
                font-size: 0.75rem;
                font-weight: 600;
                padding: 0.35rem 0.75rem;
            }
            
            /* Skeleton Loading */
            .skeleton-card {
                background: #fff;
                border-radius: 16px;
                padding: 1.5rem;
                border: 1px solid #e5e7eb;
            }
            .skeleton-loader {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 4px;
            }
            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            
            /* Animations */
            #refreshAccountsBtn.refreshing img {
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            /* Pagination */
            .pagination {
                gap: 0.25rem;
            }
            .pagination .page-link {
                border-radius: 8px;
                border: none;
                color: #6c757d;
                padding: 0.5rem 0.85rem;
            }
            .pagination .page-link:hover {
                background: #e9ecef;
            }
            .pagination .page-item.active .page-link {
                background: #0d6b66;
                color: white;
            }
            
            /* Modal Improvements */
            #userDetailsModal .modal-content {
                overflow: hidden;
            }
            .user-detail-header {
                background: linear-gradient(135deg, #0d6b66, #0a5651);
                color: white;
                padding: 2rem;
                text-align: center;
            }
            .user-detail-avatar {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2rem;
                font-weight: bold;
                margin: 0 auto 1rem;
                background: rgba(255,255,255,0.2);
                border: 3px solid rgba(255,255,255,0.3);
            }
            .user-detail-section {
                padding: 1rem 0;
            }
            .user-detail-section:not(:last-child) {
                border-bottom: 1px solid #e9ecef;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                padding: 0.75rem 0;
            }
            .detail-row:not(:last-child) {
                border-bottom: 1px solid #f0f0f0;
            }
            .detail-label {
                color: #6c757d;
                font-size: 0.875rem;
            }
            .detail-value {
                font-weight: 600;
                color: #1a1a2e;
            }
            
            /* Empty State */
            .empty-state {
                text-align: center;
                padding: 4rem 2rem;
            }
            .empty-state-icon {
                width: 80px;
                height: 80px;
                background: #f8f9fa;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem;
            }
            .empty-state-icon i {
                font-size: 2rem;
                color: #adb5bd;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .stat-card {
                    padding: 1rem;
                }
                .stat-value {
                    font-size: 1.5rem;
                }
                .stat-icon {
                    width: 40px;
                    height: 40px;
                }
                #accountFilterTabs .nav-link {
                    padding: 0.4rem 0.75rem;
                    font-size: 0.8rem;
                }
            }
        </style>
    `;
}

/**
 * Generate skeleton loading cards with improved design
 */
function getSkeletonCards(count = 8) {
    const skeletonCard = `
        <div class="col">
            <div class="skeleton-card">
                <div class="skeleton-loader mb-3" style="width: 100%; height: 4px; border-radius: 0;"></div>
                <div class="p-3">
                    <div class="d-flex align-items-center mb-3">
                        <div class="skeleton-loader rounded-circle me-3" style="width: 52px; height: 52px;"></div>
                        <div class="flex-grow-1">
                            <div class="skeleton-loader mb-2" style="width: 65%; height: 18px;"></div>
                            <div class="skeleton-loader" style="width: 45%; height: 12px;"></div>
                        </div>
                    </div>
                    <div class="skeleton-loader mb-2" style="width: 80%; height: 12px;"></div>
                    <div class="skeleton-loader mb-2" style="width: 60%; height: 12px;"></div>
                    <div class="skeleton-loader" style="width: 50%; height: 12px;"></div>
                </div>
                <div class="skeleton-footer p-3" style="background: #fafbfc; border-top: 1px solid #e9ecef;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="skeleton-loader" style="width: 70px; height: 24px; border-radius: 50px;"></div>
                        <div class="skeleton-loader" style="width: 80px; height: 28px; border-radius: 50px;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    return Array(count).fill(skeletonCard).join('');
}

async function attachAccountsListeners() {
    // Get current user for function authorization
    let currentUser;
    try {
        currentUser = await account.get();
    } catch (err) {
        console.error('Failed to get current user:', err);
    }
    
    const cardsContainer = document.getElementById('user-cards-container');
    const searchInput = document.getElementById('userSearchInput');
    const sortOptions = document.querySelectorAll('[data-sort]');
    const filterTabs = document.querySelectorAll('#accountFilterTabs [data-filter]');
    const statCards = document.querySelectorAll('.stat-card[data-filter]');
    const paginationContainer = document.getElementById('accountsPagination');
    const refreshBtn = document.getElementById('refreshAccountsBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const toggleBulkModeBtn = document.getElementById('toggleBulkModeBtn');
    const bulkEmailBtn = document.getElementById('bulkEmailBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchResultsCount = document.getElementById('searchResultsCount');
    const bulkSelectInfo = document.getElementById('bulkSelectInfo');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const quickAcceptIndicator = document.getElementById('quickAcceptIndicator');

    const userDetailsModalEl = document.getElementById('userDetailsModal');
    const userDetailsModal = new Modal(userDetailsModalEl);
    const userDetailsModalBody = document.getElementById('userDetailsModalBody');

    let allAccounts = [];
    let currentSort = 'name_asc';
    let currentFilter = 'all';
    let currentPage = 1;
    let searchTimeout;
    let bulkModeActive = false;
    let selectedAccounts = new Set();

    /**
     * Update statistics cards and filter counts
     */
    const updateFilterCounts = (accounts) => {
        const nonAdmins = accounts.filter(acc => acc.type !== 'admin');
        const active = nonAdmins.filter(acc => !acc.deactivated);
        const pending = active.filter(acc => !acc.verified && acc.type === 'student');
        const verified = active.filter(acc => acc.verified && acc.type === 'student');
        const officers = active.filter(acc => acc.type === 'officer');
        const deactivated = nonAdmins.filter(acc => acc.deactivated === true);

        // Update filter tab badges
        document.getElementById('count-all').textContent = active.length;
        document.getElementById('count-pending').textContent = pending.length;
        document.getElementById('count-verified').textContent = verified.length;
        document.getElementById('count-officers').textContent = officers.length;
        document.getElementById('count-deactivated').textContent = deactivated.length;

        // Update statistics cards
        const statTotal = document.getElementById('stat-total');
        const statPending = document.getElementById('stat-pending');
        const statVerified = document.getElementById('stat-verified');
        const statOfficers = document.getElementById('stat-officers');
        
        if (statTotal) statTotal.textContent = active.length;
        if (statPending) statPending.textContent = pending.length;
        if (statVerified) statVerified.textContent = verified.length;
        if (statOfficers) statOfficers.textContent = officers.length;

        // Show/hide bulk accept button and quick accept indicator
        const bulkAcceptBtn = document.getElementById('bulkAcceptBtn');
        if (bulkAcceptBtn) {
            bulkAcceptBtn.style.display = pending.length > 0 ? 'flex' : 'none';
        }
        if (quickAcceptIndicator) {
            quickAcceptIndicator.style.display = pending.length > 0 ? 'block' : 'none';
        }
    };

    const sortUsers = (accounts, criteria) => {
        const sorted = [...accounts];
        const getName = (a) => (a.students && a.students.name) ? a.students.name : a.username;

        if (criteria === 'name_asc') {
            sorted.sort((a, b) => getName(a).localeCompare(getName(b)));
        } else if (criteria === 'name_desc') {
            sorted.sort((a, b) => getName(b).localeCompare(getName(a)));
        } else if (criteria === 'date_desc') {
            sorted.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
        } else if (criteria === 'date_asc') {
            sorted.sort((a, b) => new Date(a.$createdAt) - new Date(b.$createdAt));
        }
        return sorted;
    };

    /**
     * Filter accounts based on current filter and search
     */
    const filterAccounts = (accounts, filter, searchTerm = '') => {
        let filtered = accounts.filter(acc => acc.type !== 'admin');

        // Apply filter
        switch (filter) {
            case 'pending':
                filtered = filtered.filter(acc => !acc.verified && acc.type === 'student' && !acc.deactivated);
                break;
            case 'verified':
                filtered = filtered.filter(acc => acc.verified && acc.type === 'student' && !acc.deactivated);
                break;
            case 'officer':
                filtered = filtered.filter(acc => acc.type === 'officer' && !acc.deactivated);
                break;
            case 'deactivated':
                filtered = filtered.filter(acc => acc.deactivated === true);
                break;
            case 'all':
            default:
                // All active (non-deactivated) accounts
                filtered = filtered.filter(acc => !acc.deactivated);
                break;
        }

        // Apply search (name, email, username, student ID)
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(acc => {
                const studentData = acc.students || {};
                const name = (studentData.name || acc.username || '').toLowerCase();
                const email = (studentData.email || '').toLowerCase();
                const username = (acc.username || '').toLowerCase();
                const studentId = (studentData.student_id || '').toLowerCase();
                return name.includes(term) || email.includes(term) || username.includes(term) || studentId.includes(term);
            });
        }

        return filtered;
    };

    /**
     * Render pagination controls with info text
     */
    const renderPagination = (totalItems, currentPage) => {
        const totalPages = Math.ceil(totalItems / ACCOUNTS_PER_PAGE);
        const paginationInfo = document.getElementById('paginationInfo');
        
        // Update pagination info
        const startItem = Math.min((currentPage - 1) * ACCOUNTS_PER_PAGE + 1, totalItems);
        const endItem = Math.min(currentPage * ACCOUNTS_PER_PAGE, totalItems);
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalItems} accounts`;
        }
        
        if (totalPages <= 1) {
            paginationContainer.style.display = totalItems > 0 ? 'flex' : 'none';
            if (paginationContainer.querySelector('ul')) {
                paginationContainer.querySelector('ul').innerHTML = '';
            }
            return;
        }

        paginationContainer.style.display = 'flex';
        const ul = paginationContainer.querySelector('ul');
        
        let html = `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}"><i class="bi bi-chevron-left"></i></a>
            </li>
        `;

        // Smart pagination - show first, last, and pages around current
        const showPages = [];
        showPages.push(1);
        
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            if (!showPages.includes(i)) showPages.push(i);
        }
        
        if (totalPages > 1) showPages.push(totalPages);
        
        let prevPage = 0;
        showPages.forEach(i => {
            if (i - prevPage > 1) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
            prevPage = i;
        });

        html += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}"><i class="bi bi-chevron-right"></i></a>
            </li>
        `;

        ul.innerHTML = html;
    };

    /**
     * Update selected count display
     */
    const updateSelectedCount = () => {
        const selectedCountEl = document.getElementById('selectedCount');
        if (selectedCountEl) {
            selectedCountEl.textContent = selectedAccounts.size;
        }
        if (bulkSelectInfo) {
            bulkSelectInfo.classList.toggle('d-none', selectedAccounts.size === 0 || !bulkModeActive);
        }
        if (bulkEmailBtn) {
            const count = selectedAccounts.size;
            bulkEmailBtn.innerHTML = `<i class="bi bi-envelope"></i><span>Email Selected ${count > 0 ? `(${count})` : ''}</span>`;
        }
    };

    const renderUserList = (accounts, page = 1) => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filtered = filterAccounts(accounts, currentFilter, searchTerm);
        const sorted = sortUsers(filtered, currentSort);
        
        // Update search results count
        if (searchResultsCount) {
            if (searchTerm) {
                searchResultsCount.textContent = `${filtered.length} result${filtered.length !== 1 ? 's' : ''} found`;
                searchResultsCount.classList.remove('d-none');
            } else {
                searchResultsCount.classList.add('d-none');
            }
        }
        
        // Show/hide clear search button
        if (clearSearchBtn) {
            clearSearchBtn.classList.toggle('d-none', !searchTerm);
        }
        
        // Pagination
        const startIndex = (page - 1) * ACCOUNTS_PER_PAGE;
        const paginatedAccounts = sorted.slice(startIndex, startIndex + ACCOUNTS_PER_PAGE);

        if (filtered.length === 0) {
            const emptyMessage = searchTerm 
                ? `No accounts match "${searchTerm}"` 
                : `No ${currentFilter === 'all' ? '' : currentFilter + ' '}accounts found`;
            
            cardsContainer.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="bi bi-${searchTerm ? 'search' : 'people'}"></i>
                        </div>
                        <h5 class="text-muted fw-semibold">${emptyMessage}</h5>
                        <p class="text-secondary small mb-3">
                            ${searchTerm 
                                ? 'Try a different search term or adjust your filters.' 
                                : 'There are no accounts in this category yet.'}
                        </p>
                        ${searchTerm ? `
                        <button class="btn btn-outline-primary btn-sm rounded-pill px-3" id="clearSearchEmpty">
                            <i class="bi bi-x-lg me-1"></i>Clear Search
                        </button>` : ''}
                    </div>
                </div>`;
            paginationContainer.style.display = 'none';
            
            // Attach clear search handler in empty state
            const clearSearchEmpty = document.getElementById('clearSearchEmpty');
            if (clearSearchEmpty) {
                clearSearchEmpty.addEventListener('click', () => {
                    searchInput.value = '';
                    currentPage = 1;
                    renderUserList(allAccounts, currentPage);
                });
            }
            return;
        }

        cardsContainer.innerHTML = paginatedAccounts.map(acc => createAccountCardHTML(acc, bulkModeActive)).join('');

        // Render pagination
        renderPagination(filtered.length, page);

        document.querySelectorAll('.dropdown-toggle').forEach(dd => new Dropdown(dd));

        // Restore checkbox states if in bulk mode
        if (bulkModeActive) {
            document.querySelectorAll('.account-checkbox').forEach(checkbox => {
                if (selectedAccounts.has(checkbox.value)) {
                    checkbox.checked = true;
                }
            });
        }
    };

    /**
     * Load accounts with retry logic
     */
    const loadAccounts = async (isRefresh = false) => {
        if (isRefresh && refreshBtn) {
            refreshBtn.classList.add('refreshing');
            refreshBtn.disabled = true;
        }

        if (!isRefresh) {
            cardsContainer.innerHTML = getSkeletonCards(6);
        }

        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID_ACCOUNTS,
                [Query.limit(500)]
            );
            allAccounts = response.documents;
            updateFilterCounts(allAccounts);
            currentPage = 1;
            renderUserList(allAccounts, currentPage);
            
            if (isRefresh) {
                toast.success('Accounts refreshed successfully');
            }
        } catch (error) {
            console.error("Failed to load accounts:", error);
            cardsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger shadow-sm border-0 d-flex align-items-center justify-content-between">
                        <span>Error loading users. Please try again.</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="location.reload()">Retry</button>
                    </div>
                </div>`;
            toast.error('Failed to load accounts');
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('refreshing');
                refreshBtn.disabled = false;
            }
        }
    };

    // Initial load
    await loadAccounts();

    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadAccounts(true));
    }

    // Export to CSV button
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            const filtered = filterAccounts(allAccounts, currentFilter, searchInput.value.toLowerCase().trim());
            if (filtered.length === 0) {
                toast.info('No accounts to export');
                return;
            }
            const timestamp = new Date().toISOString().split('T')[0];
            exportToCSV(filtered, `accounts-${currentFilter}-${timestamp}.csv`);
        });
    }

    // Toggle bulk selection mode
    if (toggleBulkModeBtn) {
        toggleBulkModeBtn.addEventListener('click', () => {
            bulkModeActive = !bulkModeActive;
            selectedAccounts.clear();

            if (bulkModeActive) {
                toggleBulkModeBtn.classList.add('active');
                toggleBulkModeBtn.classList.replace('btn-outline-secondary', 'btn-secondary');
                if (bulkEmailBtn) bulkEmailBtn.style.display = 'flex';
                if (bulkSelectInfo) bulkSelectInfo.classList.remove('d-none');
                toast.info('Bulk selection mode enabled. Click checkboxes to select accounts.', { duration: 2500 });
            } else {
                toggleBulkModeBtn.classList.remove('active');
                toggleBulkModeBtn.classList.replace('btn-secondary', 'btn-outline-secondary');
                if (bulkEmailBtn) bulkEmailBtn.style.display = 'none';
                if (bulkSelectInfo) bulkSelectInfo.classList.add('d-none');
            }

            updateSelectedCount();
            renderUserList(allAccounts, currentPage);
        });
    }
    
    // Clear selection button
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', () => {
            selectedAccounts.clear();
            updateSelectedCount();
            document.querySelectorAll('.account-checkbox').forEach(cb => cb.checked = false);
        });
    }
    
    // Clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            currentPage = 1;
            renderUserList(allAccounts, currentPage);
        });
    }
    
    // Stat card clicks (for quick filter)
    statCards.forEach(card => {
        card.addEventListener('click', () => {
            const filter = card.dataset.filter;
            if (filter) {
                // Update filter tabs
                filterTabs.forEach(t => t.classList.remove('active'));
                const matchingTab = document.querySelector(`#accountFilterTabs [data-filter="${filter}"]`);
                if (matchingTab) matchingTab.classList.add('active');
                
                // Update stat cards active state
                statCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                currentFilter = filter;
                currentPage = 1;
                renderUserList(allAccounts, currentPage);
            }
        });
    });

    // Bulk email button
    if (bulkEmailBtn) {
        bulkEmailBtn.addEventListener('click', async () => {
            if (selectedAccounts.size === 0) {
                toast.warning('Please select at least one account');
                return;
            }

            const selectedAccountsList = Array.from(selectedAccounts).map(id => {
                const acc = allAccounts.find(a => a.$id === id);
                const studentData = acc?.students || {};
                return {
                    id: id,
                    name: studentData.name || acc?.username || 'Unknown',
                    email: studentData.email || 'No email'
                };
            });

            const emailList = selectedAccountsList.map(a => a.email).filter(e => e !== 'No email').join(', ');

            if (!emailList) {
                toast.error('None of the selected accounts have email addresses');
                return;
            }

            // Show compose dialog
            const message = `Selected ${selectedAccounts.size} account(s):\n\n` +
                selectedAccountsList.map(a => `- ${a.name} (${a.email})`).join('\n') +
                `\n\nEmail addresses:\n${emailList}\n\n` +
                `You can copy these email addresses to your email client.`;

            const shouldCopy = await confirmAction('Copy Email Addresses', `Selected ${selectedAccounts.size} account(s). Copy email addresses to clipboard?`, 'Copy Emails', 'primary');
            if (shouldCopy) {
                navigator.clipboard.writeText(emailList).then(() => {
                    toast.success('Email addresses copied to clipboard!', { title: 'Copied' });
                }).catch(() => {
                    toast.error('Failed to copy to clipboard');
                });
            }
        });
    }

    // Handle checkbox selection
    cardsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('account-checkbox')) {
            const accountId = e.target.value;
            if (e.target.checked) {
                selectedAccounts.add(accountId);
            } else {
                selectedAccounts.delete(accountId);
            }
            updateSelectedCount();
        }
    });

    // Bulk Accept button
    const bulkAcceptBtn = document.getElementById('bulkAcceptBtn');
    if (bulkAcceptBtn) {
        bulkAcceptBtn.addEventListener('click', async () => {
            const pendingAccounts = allAccounts.filter(acc => 
                acc.type === 'student' && !acc.verified && !acc.deactivated
            );

            if (pendingAccounts.length === 0) {
                toast.info('No pending students to accept.');
                return;
            }
            
            if (!FUNCTION_ID) {
                toast.error('Account management function not configured. Please set VITE_FUNCTION_ID in environment.');
                console.error('FUNCTION_ID is undefined. Check your .env file.');
                return;
            }

            if (!await confirmAction('Bulk Accept Students', `Are you sure you want to accept all ${pendingAccounts.length} pending students?`, 'Accept All', 'success')) return;

            bulkAcceptBtn.disabled = true;
            bulkAcceptBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Accepting ${pendingAccounts.length}...`;

            try {
                const userIds = pendingAccounts.map(acc => acc.$id);
                
                const execution = await functions.createExecution(
                    FUNCTION_ID,
                    JSON.stringify({ action: 'bulk_accept_students', userIds: userIds, requestingUserId: currentUser?.$id }),
                    false
                );

                toast.info('Processing bulk acceptance...', { duration: 2000 });
                
                setTimeout(async () => {
                    try {
                        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, [Query.limit(500)]);
                        allAccounts = res.documents;
                        updateFilterCounts(allAccounts);
                        renderUserList(allAccounts, currentPage);
                        toast.success(`Successfully accepted ${pendingAccounts.length} students!`, { title: 'Bulk Accept Complete' });
                        logActivity('bulk_action', `Bulk accepted ${pendingAccounts.length} pending students`);
                    } catch (err) {
                        toast.error('Failed to refresh list after bulk accept');
                    }
                    bulkAcceptBtn.disabled = false;
                    bulkAcceptBtn.innerHTML = `<img src="${checkAll}" alt="Bulk Accept" style="width: 1rem; filter: brightness(0) invert(1);"><span>Accept All Pending</span>`;
                }, 1500);

            } catch (error) {
                console.error('Failed to bulk accept students:', error);
                toast.error('Failed to bulk accept students: ' + error.message);
                bulkAcceptBtn.disabled = false;
                bulkAcceptBtn.innerHTML = `<img src="${checkAll}" alt="Bulk Accept" style="width: 1rem; filter: brightness(0) invert(1);"><span>Accept All Pending</span>`;
            }
        });
    }

    // Search Listener (debounced)
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            renderUserList(allAccounts, currentPage);
        }, 300);
    });
    
    // Search on Enter key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            currentPage = 1;
            renderUserList(allAccounts, currentPage);
        }
    });

    // Filter Tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            filterTabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Also update stat cards active state
            statCards.forEach(c => c.classList.remove('active'));
            const matchingStatCard = document.querySelector(`.stat-card[data-filter="${e.currentTarget.dataset.filter}"]`);
            if (matchingStatCard) matchingStatCard.classList.add('active');
            
            currentFilter = e.currentTarget.dataset.filter;
            currentPage = 1;
            renderUserList(allAccounts, currentPage);
        });
    });

    // Sort Listener
    const sortLabelMap = {
        'name_asc': 'A-Z',
        'name_desc': 'Z-A',
        'date_desc': 'Newest',
        'date_asc': 'Oldest'
    };
    const currentSortLabel = document.getElementById('currentSortLabel');
    
    sortOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            sortOptions.forEach(opt => opt.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentSort = e.currentTarget.dataset.sort;
            
            // Update sort button label
            if (currentSortLabel) {
                currentSortLabel.textContent = sortLabelMap[currentSort] || 'Sort';
            }
            
            renderUserList(allAccounts, currentPage);
        });
    });

    // Pagination click handler
    paginationContainer.addEventListener('click', (e) => {
        e.preventDefault();
        const pageLink = e.target.closest('[data-page]');
        if (!pageLink) return;
        
        const newPage = parseInt(pageLink.dataset.page);
        if (newPage < 1) return;
        
        currentPage = newPage;
        renderUserList(allAccounts, currentPage);
        
        // Scroll to top of cards
        cardsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    cardsContainer.addEventListener('click', async (e) => {
        const target = e.target;
        const acceptBtn = target.closest('.accept-btn');
        const promoteBtn = target.closest('.promote-btn');
        const demoteBtn = target.closest('.demote-btn');
        const deactivateBtn = target.closest('.deactivate-btn');
        const reactivateBtn = target.closest('.reactivate-btn');
        const resetPasswordBtn = target.closest('.reset-password-btn');
        const deleteBtn = target.closest('.delete-btn');
        const card = target.closest('.account-card');

        /**
         * Helper to refetch accounts from database
         */
        const refetchAccounts = async () => {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, [Query.limit(500)]);
            allAccounts = res.documents;
            updateFilterCounts(allAccounts);
            renderUserList(allAccounts, currentPage);
        };

        if (acceptBtn) {
            e.preventDefault();
            
            if (!FUNCTION_ID) {
                toast.error('Account management function not configured. Please set VITE_FUNCTION_ID in environment.');
                console.error('FUNCTION_ID is undefined. Check your .env file.');
                return;
            }
            
            const docId = acceptBtn.dataset.docid;
            const originalHTML = acceptBtn.innerHTML;
            acceptBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Accepting...`;
            acceptBtn.classList.add('disabled');

            try {
                const userId = docId;

                const execution = await functions.createExecution(
                    FUNCTION_ID,
                    JSON.stringify({ action: 'accept_student', userId: userId, accountDocId: docId, requestingUserId: currentUser?.$id }),
                    false
                );

                if (execution.status === 'completed') {
                    // Update local state optimistically
                    const acc = allAccounts.find(u => u.$id === docId);
                    if (acc) acc.verified = true;
                    updateFilterCounts(allAccounts);
                    renderUserList(allAccounts, currentPage);
                    toast.success('Student accepted successfully!', { title: 'Verified' });
                    logActivity('account_verified', 'Accepted/verified a student account');
                } else {
                    console.error('Function execution status:', execution.status, execution.response);
                    toast.info('Acceptance processed. Refreshing list...');
                    // Refetch
                    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, [Query.limit(500)]);
                    allAccounts = res.documents;
                    updateFilterCounts(allAccounts);
                    renderUserList(allAccounts, currentPage);
                }

            } catch (error) {
                console.error('Failed to accept user:', error);
                toast.error('Failed to accept user: ' + error.message);
                acceptBtn.innerHTML = originalHTML;
                acceptBtn.classList.remove('disabled');
            }
            return;
        }

        if (promoteBtn) {
            e.preventDefault();
            if (!await confirmAction('Promote to Officer', 'This student will gain access to the Officer Dashboard. Are you sure?', 'Promote', 'primary')) return;

            if (!FUNCTION_ID) {
                toast.error('Account management function not configured. Please set VITE_FUNCTION_ID in environment.');
                console.error('FUNCTION_ID is undefined. Check your .env file.');
                return;
            }

            const docId = promoteBtn.dataset.docid;
            const originalHTML = promoteBtn.innerHTML;
            promoteBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Promoting...`;
            promoteBtn.classList.add('disabled');

            try {
                const userId = docId;
                const execution = await functions.createExecution(
                    FUNCTION_ID,
                    JSON.stringify({ action: 'promote_officer', userId: userId, accountDocId: docId, requestingUserId: currentUser?.$id }),
                    false
                );

                // Refetch to show changes
                toast.info('Promoting user...', { duration: 1500 });
                setTimeout(async () => {
                    try {
                        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, [Query.limit(500)]);
                        allAccounts = res.documents;
                        updateFilterCounts(allAccounts);
                        renderUserList(allAccounts, currentPage);
                        toast.success('User promoted to Officer successfully!', { title: 'Promoted' });
                        logActivity('account_promoted', 'Promoted a user to officer');
                    } catch (err) {
                        toast.error('Failed to refresh list');
                    }
                }, 1000);

            } catch (error) {
                console.error('Failed to promote user:', error);
                toast.error('Failed to promote user: ' + error.message);
                promoteBtn.innerHTML = originalHTML;
                promoteBtn.classList.remove('disabled');
            }
            return;
        }

        if (deleteBtn) {
            e.preventDefault();
            if (!await confirmAction('Delete User', 'This will permanently delete this user\'s profile. This cannot be undone.', 'Delete', 'danger')) return;
            
            const docId = deleteBtn.dataset.docid;
            const card = deleteBtn.closest('.col');
            const originalHTML = deleteBtn.innerHTML;
            deleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Deleting...`;
            deleteBtn.classList.add('disabled');
            
            try {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, docId);
                
                // Animate card removal
                if (card) {
                    card.style.transition = 'all 0.3s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.9)';
                    
                    setTimeout(() => {
                        allAccounts = allAccounts.filter(u => u.$id !== docId);
                        updateFilterCounts(allAccounts);
                        renderUserList(allAccounts, currentPage);
                    }, 300);
                } else {
                    allAccounts = allAccounts.filter(u => u.$id !== docId);
                    updateFilterCounts(allAccounts);
                    renderUserList(allAccounts, currentPage);
                }
                
                toast.success('User profile deleted successfully');
                logActivity('account_deleted', 'Deleted a user account');
            } catch (error) {
                console.error('Failed to delete user:', error);
                toast.error('Failed to delete user profile: ' + error.message);
                deleteBtn.innerHTML = originalHTML;
                deleteBtn.classList.remove('disabled');
            }
            return;
        }

        // Demote officer to student
        if (demoteBtn) {
            e.preventDefault();
            if (!await confirmAction('Demote Officer', 'This officer will lose access to the Officer Dashboard. Are you sure?', 'Demote', 'warning')) return;

            if (!FUNCTION_ID) {
                toast.error('Account management function not configured. Please set VITE_FUNCTION_ID in environment.');
                console.error('FUNCTION_ID is undefined. Check your .env file.');
                return;
            }

            const docId = demoteBtn.dataset.docid;
            const originalHTML = demoteBtn.innerHTML;
            demoteBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Demoting...`;
            demoteBtn.classList.add('disabled');

            try {
                const execution = await functions.createExecution(
                    FUNCTION_ID,
                    JSON.stringify({ action: 'demote_officer', userId: docId, accountDocId: docId, requestingUserId: currentUser?.$id }),
                    false
                );

                toast.info('Demoting officer...', { duration: 1500 });
                setTimeout(async () => {
                    try {
                        await refetchAccounts();
                        toast.success('Officer demoted to Student successfully!', { title: 'Demoted' });
                        logActivity('account_demoted', 'Demoted an officer to student');
                    } catch (err) {
                        toast.error('Failed to refresh list');
                    }
                }, 1000);

            } catch (error) {
                console.error('Failed to demote officer:', error);
                toast.error('Failed to demote officer: ' + error.message);
                demoteBtn.innerHTML = originalHTML;
                demoteBtn.classList.remove('disabled');
            }
            return;
        }

        // Deactivate account
        if (deactivateBtn) {
            e.preventDefault();
            if (!await confirmAction('Deactivate Account', 'The user will not be able to access the system until reactivated.', 'Deactivate', 'warning')) return;

            if (!FUNCTION_ID) {
                toast.error('Account management function not configured. Please set VITE_FUNCTION_ID in environment.');
                console.error('FUNCTION_ID is undefined. Check your .env file.');
                return;
            }

            const docId = deactivateBtn.dataset.docid;
            const originalHTML = deactivateBtn.innerHTML;
            deactivateBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Deactivating...`;
            deactivateBtn.classList.add('disabled');

            try {
                const execution = await functions.createExecution(
                    FUNCTION_ID,
                    JSON.stringify({ action: 'deactivate_account', userId: docId, accountDocId: docId, requestingUserId: currentUser?.$id }),
                    false
                );

                // Update local state optimistically
                const acc = allAccounts.find(u => u.$id === docId);
                if (acc) acc.deactivated = true;
                updateFilterCounts(allAccounts);
                renderUserList(allAccounts, currentPage);
                toast.success('Account deactivated successfully!', { title: 'Deactivated' });
                logActivity('account_deactivated', 'Deactivated an account');

            } catch (error) {
                console.error('Failed to deactivate account:', error);
                toast.error('Failed to deactivate account: ' + error.message);
                deactivateBtn.innerHTML = originalHTML;
                deactivateBtn.classList.remove('disabled');
            }
            return;
        }

        // Reactivate account
        if (reactivateBtn) {
            e.preventDefault();
            
            if (!FUNCTION_ID) {
                toast.error('Account management function not configured. Please set VITE_FUNCTION_ID in environment.');
                console.error('FUNCTION_ID is undefined. Check your .env file.');
                return;
            }
            
            const docId = reactivateBtn.dataset.docid;
            const originalHTML = reactivateBtn.innerHTML;
            reactivateBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Reactivating...`;
            reactivateBtn.classList.add('disabled');

            try {
                const execution = await functions.createExecution(
                    FUNCTION_ID,
                    JSON.stringify({ action: 'reactivate_account', userId: docId, accountDocId: docId, requestingUserId: currentUser?.$id }),
                    false
                );

                // Update local state optimistically
                const acc = allAccounts.find(u => u.$id === docId);
                if (acc) acc.deactivated = false;
                updateFilterCounts(allAccounts);
                renderUserList(allAccounts, currentPage);
                toast.success('Account reactivated successfully!', { title: 'Reactivated' });
                logActivity('account_reactivated', 'Reactivated an account');

            } catch (error) {
                console.error('Failed to reactivate account:', error);
                toast.error('Failed to reactivate account: ' + error.message);
                reactivateBtn.innerHTML = originalHTML;
                reactivateBtn.classList.remove('disabled');
            }
            return;
        }

        // Reset password
        if (resetPasswordBtn) {
            e.preventDefault();
            const docId = resetPasswordBtn.dataset.docid;
            const acc = allAccounts.find(u => u.$id === docId);
            const student = acc?.students || {};
            const email = student.email;

            if (!email) {
                toast.error('Cannot reset password: No email associated with this account.');
                return;
            }
            
            if (!FUNCTION_ID) {
                toast.error('Account management function not configured. Please set VITE_FUNCTION_ID in environment.');
                console.error('FUNCTION_ID is undefined. Check your .env file.');
                return;
            }

            if (!await confirmAction('Reset Password', `Send a password reset email to ${email}?`, 'Send Reset', 'primary')) return;

            const originalHTML = resetPasswordBtn.innerHTML;
            resetPasswordBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Sending...`;
            resetPasswordBtn.classList.add('disabled');

            try {
                const execution = await functions.createExecution(
                    FUNCTION_ID,
                    JSON.stringify({ action: 'reset_password', userId: docId, email: email, requestingUserId: currentUser?.$id }),
                    false
                );

                toast.success(`Password reset email sent to ${email}`, { title: 'Email Sent' });
                logActivity('password_reset', `Sent password reset to ${email}`);

            } catch (error) {
                console.error('Failed to send password reset:', error);
                toast.error('Failed to send password reset email: ' + error.message);
            } finally {
                resetPasswordBtn.innerHTML = originalHTML;
                resetPasswordBtn.classList.remove('disabled');
            }
            return;
        }

        if (target.closest('.dropdown-toggle') || target.closest('.dropdown-menu')) {
            return;
        }

        if (card) {
            const docId = card.dataset.docid;
            const account = allAccounts.find(u => u.$id === docId);
            if (!account) return;

            const student = account.students || {};
            const name = student.name || account.username;
            const isDeactivated = account.deactivated === true;
            const isOfficer = account.type === 'officer';
            const isVerified = account.verified === true;
            const joinedDate = new Date(account.$createdAt).toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });
            const joinedRelative = getRelativeTime(new Date(account.$createdAt));

            document.getElementById('userDetailsModalLabel').textContent = 'Account Details';

            // Determine status info
            let statusText, statusIcon, headerGradient;
            if (isDeactivated) {
                statusText = 'Deactivated';
                statusIcon = 'bi-person-slash';
                headerGradient = 'linear-gradient(135deg, #6c757d, #495057)';
            } else if (isOfficer) {
                statusText = 'Officer';
                statusIcon = 'bi-shield-check';
                headerGradient = 'linear-gradient(135deg, #0dcaf0, #0aa2c0)';
            } else if (isVerified) {
                statusText = 'Verified Student';
                statusIcon = 'bi-patch-check-fill';
                headerGradient = 'linear-gradient(135deg, #198754, #157347)';
            } else {
                statusText = 'Pending Verification';
                statusIcon = 'bi-hourglass-split';
                headerGradient = 'linear-gradient(135deg, #ffc107, #e0a800)';
            }

            // Build enhanced modal content
            let detailsHTML = `
                <div class="user-detail-header" style="background: ${headerGradient}; margin: -1.5rem -1.5rem 1.5rem -1.5rem; border-radius: 1rem 1rem 0 0;">
                    <div class="user-detail-avatar">
                        ${name.charAt(0).toUpperCase()}
                    </div>
                    <h4 class="fw-bold mb-1">${name}</h4>
                    <p class="mb-2 opacity-75">@${account.username}</p>
                    <span class="badge bg-white bg-opacity-25 px-3 py-2 rounded-pill">
                        <i class="bi ${statusIcon} me-1"></i>${statusText}
                    </span>
                </div>
                
                <div class="row g-3 mb-4">
                    <div class="col-6">
                        <div class="p-3 bg-light rounded-3 text-center h-100">
                            <div class="text-muted small mb-1">Role</div>
                            <div class="fw-bold text-capitalize">${account.type}</div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="p-3 bg-light rounded-3 text-center h-100">
                            <div class="text-muted small mb-1">Year Level</div>
                            <div class="fw-bold">${student.yearLevel ? 'Year ' + student.yearLevel : 'N/A'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="user-detail-section">
                    <h6 class="text-muted text-uppercase small fw-bold mb-3">
                        <i class="bi bi-person-lines-fill me-2"></i>Personal Information
                    </h6>
                    <div class="detail-row">
                        <span class="detail-label">Full Name</span>
                        <span class="detail-value">${name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email Address</span>
                        <span class="detail-value">${student.email || '<span class="text-muted">Not provided</span>'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Student ID</span>
                        <span class="detail-value">${student.student_id || '<span class="text-muted">Not provided</span>'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Section</span>
                        <span class="detail-value">${student.section || '<span class="text-muted">Not assigned</span>'}</span>
                    </div>
                </div>
                
                <div class="user-detail-section">
                    <h6 class="text-muted text-uppercase small fw-bold mb-3">
                        <i class="bi bi-gear me-2"></i>Account Information
                    </h6>
                    <div class="detail-row">
                        <span class="detail-label">Username</span>
                        <span class="detail-value">@${account.username}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Account Type</span>
                        <span class="detail-value text-capitalize">${account.type}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Verification Status</span>
                        <span class="detail-value">
                            ${isVerified || isOfficer 
                                ? '<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Verified</span>' 
                                : '<span class="text-warning"><i class="bi bi-clock-fill me-1"></i>Pending</span>'}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Account Status</span>
                        <span class="detail-value">
                            ${isDeactivated 
                                ? '<span class="text-danger"><i class="bi bi-x-circle-fill me-1"></i>Deactivated</span>' 
                                : '<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Active</span>'}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Joined</span>
                        <span class="detail-value">${joinedDate} <small class="text-muted">(${joinedRelative})</small></span>
                    </div>
                </div>
                
                ${student.is_volunteer || (student.volunteer_request_status && student.volunteer_request_status !== 'none') ? `
                <div class="user-detail-section">
                    <h6 class="text-muted text-uppercase small fw-bold mb-3">
                        <i class="bi bi-hand-thumbs-up me-2"></i>Volunteer Information
                    </h6>
                    <div class="detail-row">
                        <span class="detail-label">Volunteer Status</span>
                        <span class="detail-value">
                            ${student.is_volunteer 
                                ? '<span class="text-success"><i class="bi bi-check-circle-fill me-1"></i>Active Volunteer</span>' 
                                : '<span class="text-muted">Not a volunteer</span>'}
                        </span>
                    </div>
                    ${student.volunteer_request_status && student.volunteer_request_status !== 'none' ? `
                    <div class="detail-row">
                        <span class="detail-label">Request Status</span>
                        <span class="detail-value text-capitalize">${student.volunteer_request_status}</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                
                <div class="d-flex gap-2 mt-4 pt-3 border-top justify-content-end">
                    <button type="button" class="btn btn-outline-secondary btn-sm rounded-pill px-3" data-bs-dismiss="modal">Close</button>
                </div>
            `;

            userDetailsModalBody.innerHTML = detailsHTML;
        }
    });

    // Handle quick action buttons on cards
    cardsContainer.addEventListener('click', async (e) => {
        const quickAcceptBtn = e.target.closest('.quick-accept-btn');
        const quickPromoteBtn = e.target.closest('.quick-promote-btn');
        const quickDemoteBtn = e.target.closest('.quick-demote-btn');
        const quickReactivateBtn = e.target.closest('.quick-reactivate-btn');
        
        if (quickAcceptBtn) {
            e.preventDefault();
            e.stopPropagation();
            const docId = quickAcceptBtn.dataset.docid;
            // Trigger the accept action
            const acceptBtn = document.querySelector(`.accept-btn[data-docid="${docId}"]`);
            if (acceptBtn) acceptBtn.click();
        }
        
        if (quickPromoteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const docId = quickPromoteBtn.dataset.docid;
            const promoteBtn = document.querySelector(`.promote-btn[data-docid="${docId}"]`);
            if (promoteBtn) promoteBtn.click();
        }
        
        if (quickDemoteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const docId = quickDemoteBtn.dataset.docid;
            const demoteBtn = document.querySelector(`.demote-btn[data-docid="${docId}"]`);
            if (demoteBtn) demoteBtn.click();
        }
        
        if (quickReactivateBtn) {
            e.preventDefault();
            e.stopPropagation();
            const docId = quickReactivateBtn.dataset.docid;
            const reactivateBtn = document.querySelector(`.reactivate-btn[data-docid="${docId}"]`);
            if (reactivateBtn) reactivateBtn.click();
        }
    });
}

export default function renderAccountsView() {
    return {
        html: getAccountsHTML(),
        afterRender: attachAccountsListeners
    };
}
