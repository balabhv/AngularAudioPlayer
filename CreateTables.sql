CREATE SEQUENCE user_id_seq;
CREATE TABLE USERS
( USER_ID	int not null primary key default nextval('user_id_seq'),
FIRST_NM	varchar(120)	not null,
LAST_NM	varchar(120)	not null,
EMAIL_ID	varchar(120)	not null,
MOBILE_NO	varchar(20)	not null,
SCRN_NM	varchar(20)	not null,
PASS_WD	varchar(20)	not null,
DOB_MO	int	not null,
DOB_DY	int	not null,
DOB_YR	int	not null,
ZIP_CD	varchar(12)	not null,
VERIF_CD	varchar(20));

CREATE SEQUENCE sec_ques_ref_id_seq;
CREATE TABLE SEC_QUES_REF(
SEC_QUES_ID	int not null primary key default nextval('sec_ques_ref_id_seq'),
QUES_DSC varchar(100) not null);

CREATE SEQUENCE user_sec_ques_id_seq;
CREATE TABLE USER_SEC_QUES (
USER_SEC_QUES int not null primary key default nextval('user_sec_ques_id_seq'), 
USER_ID	int	not null references USERS(USER_ID),
SEC_QUES_ID int not null references SEC_QUES_REF(SEC_QUES_ID),
ANSWER_TXT varchar(100)	not null);

INSERT INTO SEC_QUES_REF (SEC_QUES_ID, QUES_DSC) VALUES (1, 'In what city did you meet your spouse?');
INSERT INTO SEC_QUES_REF (SEC_QUES_ID, QUES_DSC) VALUES (2, 'What is your 6th grade math teacher''s first name?');
INSERT INTO SEC_QUES_REF (SEC_QUES_ID, QUES_DSC) VALUES (3, 'What is the street you lived on in your childhood?');
INSERT INTO SEC_QUES_REF (SEC_QUES_ID, QUES_DSC) VALUES (4, 'In what city did your parents get married?');
INSERT INTO SEC_QUES_REF (SEC_QUES_ID, QUES_DSC) VALUES (5, 'Who was the artist that performed at the first concert you went to?');
