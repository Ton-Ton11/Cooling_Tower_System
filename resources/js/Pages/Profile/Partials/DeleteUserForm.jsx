import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function DeleteUserForm({ className = '' }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e?.preventDefault?.();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);

        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">
                    Delete Account
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                    Once your account is deleted, all of its resources and data
                    will be permanently deleted. Before deleting your account,
                    please download any data or information that you wish to
                    retain.
                </p>
            </header>

            <DangerButton onClick={confirmUserDeletion}>
                Delete Account
            </DangerButton>

            <Modal
                open={confirmingUserDeletion}
                title="Are you sure you want to delete your account?"
                message="Once your account is deleted, all of its resources and data will be permanently deleted. Please enter your password to confirm you would like to permanently delete your account."
                variant="danger"
                confirmLabel="Delete Account"
                cancelLabel="Cancel"
                confirmDisabled={processing}
                onConfirm={deleteUser}
                onCancel={closeModal}
                maxWidth={480}
            >
                <form onSubmit={deleteUser}>
                    <InputLabel
                        htmlFor="password"
                        value="Password"
                        className="sr-only"
                    />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        ref={passwordInput}
                        value={data.password}
                        onChange={(e) =>
                            setData('password', e.target.value)
                        }
                        className="mt-1 block w-full"
                        isFocused
                        placeholder="Password"
                    />

                    <InputError
                        message={errors.password}
                        className="mt-2"
                    />
                </form>
            </Modal>
        </section>
    );
}
