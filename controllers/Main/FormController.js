const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { singleFileDelete } = require('../../utils/S3Utils');

// Get all forms with pagination
exports.getAllForms = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const skip = (page - 1) * parseInt(limit);
        
        const where = {};
        if (status) {
            where.status = status;
        }
        
        const [forms, total] = await Promise.all([
            prisma.form.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    // author: {
                    //     select: {
                    //         id: true,
                    //         name: true
                    //     }
                    // },
                    _count: {
                        select: {
                            fields: true,
                            submissions: true
                        }
                    }
                }
            }),
            prisma.form.count({ where })
        ]);
        
        return res.status(200).json({
            forms,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('Error fetching forms:', error);
        return res.status(500).json({ error: 'Failed to fetch forms' });
    }
};

// Get published forms
exports.getPublishedForms = async (req, res) => {
    try {
        const forms = await prisma.form.findMany({
            where: {
                status: 'published'
            },
            select: {
                id: true,
                title: true,
                slug: true,
                description: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        return res.status(200).json(forms);
    } catch (error) {
        console.error('Error fetching published forms:', error);
        return res.status(500).json({ error: 'Failed to fetch published forms' });
    }
};

// Get a single form by id or slug
exports.getForm = async (req, res) => {
    try {
        const { id, slug } = req.params;
        
        let where = {};
        if (id && !isNaN(parseInt(id))) {
            where.id = parseInt(id);
        } else if (slug) {
            where.slug = slug;
        } else {
            return res.status(400).json({ error: 'Form ID or slug is required' });
        }
        
        const form = await prisma.form.findUnique({
            where,
            include: {
                fields: {
                    include: {
                        options: {
                            orderBy: {
                                orderIndex: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        orderIndex: 'asc'
                    }
                },
                // author: {
                //     select: {
                //         id: true,
                //         name: true
                //     }
                // }
            }
        });
        
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }
        
        return res.status(200).json(form);
    } catch (error) {
        console.error('Error fetching form:', error);
        return res.status(500).json({ error: 'Failed to fetch form' });
    }
};

// Create a new form
exports.createForm = async (req, res) => {
    try {
        const { title, slug, description, status, fields } = req.body;
        
        // Check if slug is unique
        const existingForm = await prisma.form.findUnique({
            where: { slug }
        });
        
        if (existingForm) {
            return res.status(400).json({ error: 'A form with this slug already exists' });
        }
        
        // Create the form
        const form = await prisma.form.create({
            data: {
                title,
                slug,
                description,
                authorId: req.user.id,
                status: status || 'draft',
            }
        });
        
        // Create fields if provided
        if (fields && Array.isArray(fields) && fields.length > 0) {
            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                const createdField = await prisma.formField.create({
                    data: {
                        formId: form.id,
                        type: field.type,
                        label: field.label,
                        placeholder: field.placeholder,
                        isRequired: field.isRequired || false,
                        orderIndex: field.orderIndex || i,
                        note: field.note,
                        nextQuestionId: field.nextQuestionId,
                        isExpired: field.isExpired || false
                    }
                });
                
                // Create options if provided
                if (field.options && Array.isArray(field.options) && field.options.length > 0) {
                    const optionsPromises = field.options.map((option, optionIndex) => {
                        return prisma.formFieldOption.create({
                            data: {
                                fieldId: createdField.id,
                                label: option.label,
                                value: option.value,
                                image: option.image,
                                nextQuestionId: option.nextQuestionId,
                                isEnd: option.isEnd === true,
                                orderIndex: option.orderIndex || optionIndex
                            }
                        });
                    });
                    
                    await Promise.all(optionsPromises);
                }
            }
        }
        
        // Return the created form with fields
        const createdForm = await prisma.form.findUnique({
            where: { id: form.id },
            include: {
                fields: {
                    include: {
                        options: {
                            orderBy: {
                                orderIndex: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        orderIndex: 'asc'
                    }
                },
                // author: {
                //     select: {
                //         id: true,
                //         name: true
                //     }
                // }
            }
        });
        
        return res.status(201).json(createdForm);
    } catch (error) {
        console.error('Error creating form:', error);
        return res.status(500).json({ error: 'Failed to create form' });
    }
};

// Update a form
exports.updateForm = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, slug, description, status, fields } = req.body;
        console.log('Form data--->', JSON.stringify(req.body))
        
        // Check if form exists
        const existingForm = await prisma.form.findUnique({
            where: { id: parseInt(id) },
            include: { fields: true }
        });
        
        if (!existingForm) {
            return res.status(404).json({ error: 'Form not found' });
        }
        
        // If slug is being changed, check if it's unique
        if (slug && slug !== existingForm.slug) {
            const slugExists = await prisma.form.findUnique({
                where: { slug }
            });
            
            if (slugExists) {
                return res.status(400).json({ error: 'A form with this slug already exists' });
            }
        }
        
        // Update the form
        const updatedForm = await prisma.form.update({
            where: { id: parseInt(id) },
            data: {
                title,
                slug,
                description,
                status,
                updatedAt: new Date()
            }
        });
        
        // Handle fields update if provided
        if (fields && Array.isArray(fields)) {
            // Get existing field IDs
            const existingFieldIds = existingForm.fields.map(field => field.id);
            
            // Determine which fields to create, update, or delete
            const fieldIdsToKeep = fields
                .filter(field => field.id)
                .map(field => field.id);
            
            const fieldIdsToDelete = existingFieldIds.filter(id => !fieldIdsToKeep.includes(id));
            
            // Delete fields that are not in the updated list
            if (fieldIdsToDelete.length > 0) {
                await prisma.formField.deleteMany({
                    where: {
                        id: { in: fieldIdsToDelete }
                    }
                });
            }
            
            // Update or create fields
            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                
                if (field.id) {
                    // Update existing field
                    const updatedField = await prisma.formField.update({
                        where: { id: field.id },
                        data: {
                            type: field.type,
                            label: field.label,
                            placeholder: field.placeholder,
                            isRequired: field.isRequired || false,
                            orderIndex: field.orderIndex || i,
                            note: field.note,
                            nextQuestionId: field.nextQuestionId,
                            isExpired: field.isExpired || false,
                            updatedAt: new Date()
                        }
                    });
                    
                    // Handle options update
                    if (field.options && Array.isArray(field.options)) {
                        // Get existing option IDs
                        const existingOptions = await prisma.formFieldOption.findMany({
                            where: { fieldId: field.id }
                        });
                        
                        const existingOptionIds = existingOptions.map(option => option.id);
                        
                        // Determine which options to create, update, or delete
                        const optionIdsToKeep = field.options
                            .filter(option => option.id)
                            .map(option => option.id);
                        
                        const optionIdsToDelete = existingOptionIds.filter(id => !optionIdsToKeep.includes(id));
                        
                        // Delete options that are not in the updated list
                        if (optionIdsToDelete.length > 0) {
                            await prisma.formFieldOption.deleteMany({
                                where: {
                                    id: { in: optionIdsToDelete }
                                }
                            });
                        }
                        
                        // Update or create options
                        for (let j = 0; j < field.options.length; j++) {
                            const option = field.options[j];
                            
                            if (option.id) {
                                // Update existing option
                                await prisma.formFieldOption.update({
                                    where: { id: option.id },
                                    data: {
                                        label: option.label,
                                        value: option.value,
                                        image: option.image,
                                        nextQuestionId: option.nextQuestionId,
                                        isEnd: option.isEnd === true,
                                        orderIndex: option.orderIndex || j,
                                        updatedAt: new Date()
                                    }
                                });
                            } else {
                                // Create new option
                                await prisma.formFieldOption.create({
                                    data: {
                                        fieldId: field.id,
                                        label: option.label,
                                        value: option.value,
                                        image: option.image,
                                        nextQuestionId: option.nextQuestionId,
                                        isEnd: option.isEnd === true,
                                        orderIndex: option.orderIndex || j
                                    }
                                });
                            }
                        }
                    }
                } else {
                    // Create new field
                    const newField = await prisma.formField.create({
                        data: {
                            formId: parseInt(id),
                            type: field.type,
                            label: field.label,
                            placeholder: field.placeholder,
                            isRequired: field.isRequired || false,
                            orderIndex: field.orderIndex || i,
                            note: field.note,
                            nextQuestionId: field.nextQuestionId,
                            isExpired: field.isExpired || false
                        }
                    });
                    
                    // Create options if provided
                    if (field.options && Array.isArray(field.options) && field.options.length > 0) {
                        const optionsPromises = field.options.map((option, optionIndex) => {
                            return prisma.formFieldOption.create({
                                data: {
                                    fieldId: newField.id,
                                    label: option.label,
                                    value: option.value,
                                    image: option.image,
                                    nextQuestionId: option.nextQuestionId,
                                    isEnd: option.isEnd === true,
                                    orderIndex: option.orderIndex || optionIndex
                                }
                            });
                        });
                        
                        await Promise.all(optionsPromises);
                    }
                }
            }
        }
        
        // Return the updated form with fields
        const result = await prisma.form.findUnique({
            where: { id: parseInt(id) },
            include: {
                fields: {
                    include: {
                        options: {
                            orderBy: {
                                orderIndex: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        orderIndex: 'asc'
                    }
                },
                // author: {
                //     select: {
                //         id: true,
                //         name: true
                //     }
                // }
            }
        });
        
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error updating form:', error);
        return res.status(500).json({ error: 'Failed to update form' });
    }
};

// Delete a form
exports.deleteForm = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if form exists
        const existingForm = await prisma.form.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!existingForm) {
            return res.status(404).json({ error: 'Form not found' });
        }
        
        // Get all submissions for this form to delete their files
        const submissions = await prisma.formSubmission.findMany({
            where: { formId: parseInt(id) }
        });
        
        // Delete files from each submission
        for (const submission of submissions) {
            await deleteSubmissionFiles(submission.data);
        }
        
        // Delete the form (fields and options will cascade delete)
        await prisma.form.delete({
            where: { id: parseInt(id) }
        });
        
        return res.status(200).json({ message: 'Form deleted successfully' });
    } catch (error) {
        console.error('Error deleting form:', error);
        return res.status(500).json({ error: 'Failed to delete form' });
    }
};

// Submit a form
exports.submitForm = async (req, res) => {
    try {
        const { id } = req.params;
        const formData = req.body;
        console.log('formData', JSON.stringify(formData))
        
        // Check if form exists
        const form = await prisma.form.findUnique({
            where: { id: parseInt(id) },
            include: {
                fields: {
                    where: {
                        isRequired: true
                    },
                    include: {
                        options: true
                    }
                }
            }
        });
        
        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }
        
        // Validate required fields
        const requiredFields = form.fields.map(field => field.id.toString());
        const submittedFields = Object.keys(formData);
        
        const missingFields = requiredFields.filter(field => {
            // For question fields, we check if the associated answer is provided
            const fieldObj = form.fields.find(f => f.id.toString() === field);
            if (fieldObj && fieldObj.type === 'question') {
                // For question fields, check if the selected option is in formData
                return !formData[`question_${field}`];
            }
            return !submittedFields.includes(field);
        });
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields
            });
        }
        
        // Process the formData to extract answers to questions
        const processedData = { ...formData };
        
        // For each question field, add the selected option information
        form.fields.forEach(field => {
            if (field.type === 'question') {
                const questionAnswer = formData[`question_${field.id}`];
                if (questionAnswer) {
                    // Find the selected option
                    const selectedOption = field.options.find(opt => opt.id.toString() === questionAnswer);
                    if (selectedOption) {
                        processedData[`question_${field.id}_text`] = selectedOption.label || '';
                        processedData[`question_${field.id}_option`] = selectedOption;
                    }
                }
            }
        });
        
        // Create submission
        const submission = await prisma.formSubmission.create({
            data: {
                formId: parseInt(id),
                data: processedData,
                status: 'new'
            }
        });
        
        return res.status(201).json(submission);
    } catch (error) {
        console.error('Error submitting form:', error);
        return res.status(500).json({ error: 'Failed to submit form' });
    }
};

// Get form submissions
exports.getFormSubmissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, status } = req.query;
        const skip = (page - 1) * parseInt(limit);
        
        const where = { formId: parseInt(id) };
        
        if (status) {
            where.status = status;
        }
        
        const [submissions, total] = await Promise.all([
            prisma.formSubmission.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: 'desc' }
            }),
            prisma.formSubmission.count({ where })
        ]);
        
        return res.status(200).json({
            submissions,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        console.error('Error fetching form submissions:', error);
        return res.status(500).json({ error: 'Failed to fetch form submissions' });
    }
};

// Get a form submission
exports.getFormSubmission = async (req, res) => {
    try {
        const { id, submissionId } = req.params;
        
        const submission = await prisma.formSubmission.findFirst({
            where: {
                id: parseInt(submissionId),
                formId: parseInt(id)
            }
        });
        
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        
        return res.status(200).json(submission);
    } catch (error) {
        console.error('Error fetching form submission:', error);
        return res.status(500).json({ error: 'Failed to fetch form submission' });
    }
};

// Update a form submission status
exports.updateFormSubmissionStatus = async (req, res) => {
    try {
        const { id, submissionId } = req.params;
        const { status } = req.body;
        
        // Check if submission exists
        const submission = await prisma.formSubmission.findFirst({
            where: {
                id: parseInt(submissionId),
                formId: parseInt(id)
            }
        });
        
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        
        // Update submission status
        const updatedSubmission = await prisma.formSubmission.update({
            where: { id: parseInt(submissionId) },
            data: { status }
        });
        
        return res.status(200).json(updatedSubmission);
    } catch (error) {
        console.error('Error updating submission status:', error);
        return res.status(500).json({ error: 'Failed to update submission status' });
    }
};

// Add helper function to process and delete file uploads
const deleteSubmissionFiles = async (submissionData) => {
    if (!submissionData || typeof submissionData !== 'object') return;
    
    // Iterate through all submission data fields
    for (const [key, value] of Object.entries(submissionData)) {
        // Check if the value is an object with _id property (file upload)
        if (value && typeof value === 'object' && value._id) {
            try {
                await singleFileDelete(value._id);
                console.log(`Deleted file ${value._id} from submission`);
            } catch (error) {
                console.error(`Error deleting file ${value._id}:`, error);
            }
        }
    }
};

// Update delete form submission function
exports.deleteFormSubmission = async (req, res) => {
    try {
        const { id, submissionId } = req.params;
        console.log("DELETE FORM SUBMISSION-->", req.params);
        
        // Find the submission to get file data before deletion
        const submission = await prisma.formSubmission.findUnique({
            where: { id: parseInt(submissionId) }
        });
        
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        
        // Delete any files in the submission
        await deleteSubmissionFiles(submission.data);
        
        // Delete the submission
        await prisma.formSubmission.delete({
            where: { id: parseInt(submissionId) }
        });
        
        return res.status(200).json({ message: 'Submission deleted successfully' });
    } catch (error) {
        console.error('Error deleting submission:', error);
        return res.status(500).json({ error: 'Failed to delete submission' });
    }
};

// Add a note to a form submission
exports.addNoteToSubmission = async (req, res) => {
    try {
        const { id, submissionId } = req.params;
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({ error: 'Note content is required' });
        }
        
        // Find the submission
        const submission = await prisma.formSubmission.findUnique({
            where: { id: parseInt(submissionId) }
        });
        
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        
        // Create a new note
        const newNote = {
            id: Date.now(), // Use timestamp as unique ID
            content,
            createdAt: new Date()
        };
        
        // Get existing notes or initialize empty array
        const existingNotes = submission.notes || [];
        
        // Add the new note
        await prisma.formSubmission.update({
            where: { id: parseInt(submissionId) },
            data: { 
                notes: Array.isArray(existingNotes) 
                    ? [...existingNotes, newNote] 
                    : [newNote],
                updatedAt: new Date()
            }
        });
        
        return res.status(200).json({ message: 'Note added successfully', note: newNote });
    } catch (error) {
        console.error('Error adding note:', error);
        return res.status(500).json({ error: 'Failed to add note' });
    }
};

// Delete a note from a form submission
exports.deleteNoteFromSubmission = async (req, res) => {
    try {
        const { id, submissionId, noteId } = req.params;
        
        // Find the submission
        const submission = await prisma.formSubmission.findUnique({
            where: { id: parseInt(submissionId) }
        });
        
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        
        // Get existing notes
        const existingNotes = submission.notes || [];
        
        if (!Array.isArray(existingNotes)) {
            return res.status(400).json({ error: 'Notes data is corrupted' });
        }
        
        // Filter out the note to delete
        const filteredNotes = existingNotes.filter(note => note.id !== parseInt(noteId));
        
        if (existingNotes.length === filteredNotes.length) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        // Update the submission with filtered notes
        await prisma.formSubmission.update({
            where: { id: parseInt(submissionId) },
            data: { 
                notes: filteredNotes,
                updatedAt: new Date()
            }
        });
        
        return res.status(200).json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        return res.status(500).json({ error: 'Failed to delete note' });
    }
}; 