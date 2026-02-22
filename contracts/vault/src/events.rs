//! VaultDAO - Event Publishing
//!
//! Standardized events for proposal lifecycle and admin actions.

use soroban_sdk::{Address, Env, Symbol};

/// Emit when contract is initialized
pub fn emit_initialized(env: &Env, admin: &Address, threshold: u32) {
    env.events().publish(
        (Symbol::new(env, "initialized"),),
        (admin.clone(), threshold),
    );
}

/// Emit when a new proposal is created
pub fn emit_proposal_created(
    env: &Env,
    proposal_id: u64,
    proposer: &Address,
    recipient: &Address,
    amount: i128,
) {
    env.events().publish(
        (Symbol::new(env, "proposal_created"), proposal_id),
        (proposer.clone(), recipient.clone(), amount),
    );
}

/// Emit when a proposal is approved by a signer
pub fn emit_proposal_approved(
    env: &Env,
    proposal_id: u64,
    approver: &Address,
    approval_count: u32,
    threshold: u32,
) {
    env.events().publish(
        (Symbol::new(env, "proposal_approved"), proposal_id),
        (approver.clone(), approval_count, threshold),
    );
}

/// Emit when a signer abstains from a proposal
pub fn emit_proposal_abstained(
    env: &Env,
    proposal_id: u64,
    abstainer: &Address,
    abstention_count: u32,
) {
    env.events().publish(
        (Symbol::new(env, "proposal_abstained"), proposal_id),
        (abstainer.clone(), abstention_count),
    );
}

/// Emit when an attachment is added to a proposal
pub fn emit_attachment_added(
    env: &Env,
    proposal_id: u64,
    ipfs_hash: &soroban_sdk::String,
    adder: &Address,
) {
    env.events().publish(
        (Symbol::new(env, "attachment_added"), proposal_id),
        (ipfs_hash.clone(), adder.clone()),
    );
}

/// Emit when an attachment is removed from a proposal
pub fn emit_attachment_removed(
    env: &Env,
    proposal_id: u64,
    ipfs_hash: &soroban_sdk::String,
    remover: &Address,
) {
    env.events().publish(
        (Symbol::new(env, "attachment_removed"), proposal_id),
        (ipfs_hash.clone(), remover.clone()),
    );
}

/// Emit when a proposal reaches threshold and is ready for execution
pub fn emit_proposal_ready(env: &Env, proposal_id: u64) {
    env.events()
        .publish((Symbol::new(env, "proposal_ready"), proposal_id), ());
}

/// Emit when a proposal is executed
pub fn emit_proposal_executed(
    env: &Env,
    proposal_id: u64,
    executor: &Address,
    recipient: &Address,
    amount: i128,
) {
    env.events().publish(
        (Symbol::new(env, "proposal_executed"), proposal_id),
        (executor.clone(), recipient.clone(), amount),
    );
}

/// Emit when a proposal is rejected
pub fn emit_proposal_rejected(env: &Env, proposal_id: u64, rejector: &Address) {
    env.events().publish(
        (Symbol::new(env, "proposal_rejected"), proposal_id),
        rejector.clone(),
    );
}

/// Emit when a role is assigned
pub fn emit_role_assigned(env: &Env, addr: &Address, role: u32) {
    env.events()
        .publish((Symbol::new(env, "role_assigned"),), (addr.clone(), role));
}

/// Emit when config is updated
pub fn emit_config_updated(env: &Env, updater: &Address) {
    env.events()
        .publish((Symbol::new(env, "config_updated"),), updater.clone());
}

/// Emit when a signer is added
pub fn emit_signer_added(env: &Env, signer: &Address, total_signers: u32) {
    env.events().publish(
        (Symbol::new(env, "signer_added"),),
        (signer.clone(), total_signers),
    );
}

/// Emit when a signer is removed
pub fn emit_signer_removed(env: &Env, signer: &Address, total_signers: u32) {
    env.events().publish(
        (Symbol::new(env, "signer_removed"),),
        (signer.clone(), total_signers),
    );
}

/// Emit when a comment is added
pub fn emit_comment_added(env: &Env, comment_id: u64, proposal_id: u64, author: &Address) {
    env.events().publish(
        (Symbol::new(env, "comment_added"), comment_id),
        (proposal_id, author.clone()),
    );
}

/// Emit when a comment is edited
pub fn emit_comment_edited(env: &Env, comment_id: u64, author: &Address) {
    env.events().publish(
        (Symbol::new(env, "comment_edited"), comment_id),
        author.clone(),
    );
}

/// Emit enhanced config update with before/after values
pub fn emit_config_changed(
    env: &Env,
    updater: &Address,
    field: Symbol,
    old_value: i128,
    new_value: i128,
) {
    env.events().publish(
        (Symbol::new(env, "config_changed"),),
        (updater.clone(), field, old_value, new_value),
    );
}

/// Emit enhanced threshold update
pub fn emit_threshold_changed(env: &Env, admin: &Address, old_threshold: u32, new_threshold: u32) {
    env.events().publish(
        (Symbol::new(env, "threshold_changed"),),
        (admin.clone(), old_threshold, new_threshold),
    );
}
